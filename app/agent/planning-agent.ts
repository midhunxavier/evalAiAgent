import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { type SimulationToolSet } from "./tools";

/**
 * Schema for the planning agent's output
 */
const planningAgentOutputSchema = z.object({
  plan: z.array(z.enum([
    "move_to_left_skill",
    "move_to_right_skill",
    "pick_workpiece_skill",
    "place_workpiece_skill",
    "push_workpiece_skill",
    "load_magazine_skill"
  ])).describe("The sequence of skills to execute"),
  explanation: z.string().describe("A brief explanation of why this plan was chosen")
});

type PlanningAgentOutput = z.infer<typeof planningAgentOutputSchema>;

// Available GPT models
export const AVAILABLE_MODELS = {
  "gpt-4o-mini": "GPT-4o Mini",
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-4": "GPT-4 Turbo"
};

export type ModelName = keyof typeof AVAILABLE_MODELS;

/**
 * Creates a planning agent that generates and executes a sequence of skills
 * @param simulationTools The simulation tools to use
 * @param modelName The model to use
 * @returns A function that takes a query and returns a result
 */
export function createPlanningAgent(simulationTools: SimulationToolSet, modelName: ModelName = "gpt-4o-mini") {
  // Create the prompt template
  const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are controlling a factory distributing station with a ROTATING ARM and a STACKED MAGAZINE.

Available Skills:
- move_to_left_skill: Moves the arm to the left (toward magazine)
- move_to_right_skill: Moves the arm to the right
- pick_workpiece_skill: Picks the workpiece (must be pushed first and arm must be in left position)
- place_workpiece_skill: Places the workpiece (arm must be in right position)
- push_workpiece_skill: Pushes a workpiece from magazine (magazine must have workpieces)
- load_magazine_skill: Loads 6 workpieces into the magazine

Operating Rules:
1. The arm must be in the left position to pick a workpiece
2. The arm must be in the right position to place a workpiece
3. A workpiece must be pushed from the magazine before it can be picked
4. The magazine can hold a maximum of 6 workpieces at a time
5. The arm can only hold one workpiece at a time

Current State of the System:
{systemState}

Based on the following user request, create a plan of skills to execute:
"{query}"

You MUST respond with a JSON object containing a "plan" (an array of skills to execute in order) and an "explanation" for why you chose this plan.
Make sure your plan follows the operating rules and accounts for the current state of the system.
`);

  // Create the model with structured output
  const model = new ChatOpenAI({
    modelName: modelName,
    temperature: 0,
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
  }).withStructuredOutput(planningAgentOutputSchema);

  // Create the inference chain
  const chain = promptTemplate.pipe(model);

  // Return a function that executes the plan
  return async (query: string, systemState: string): Promise<{ results: string[]; explanation: string; plan: string[] }> => {
    try {
      console.log("Planning Agent: Processing query:", query);
      console.log("Planning Agent: Current system state:", systemState);
      console.log("Planning Agent: Using model:", modelName);
      
      // Get the plan to execute
      const output = await chain.invoke({ query, systemState });
      console.log("Planning Agent: Generated plan:", output.plan);
      
      // Map the skill names to the corresponding tools
      const skillMap: Record<string, keyof SimulationToolSet> = {
        "move_to_left_skill": "moveToLeftSkill",
        "move_to_right_skill": "moveToRightSkill",
        "pick_workpiece_skill": "pickWorkpieceSkill",
        "place_workpiece_skill": "placeWorkpieceSkill",
        "push_workpiece_skill": "pushWorkpieceSkill",
        "load_magazine_skill": "loadMagazineSkill"
      };

      // Execute the skills one by one
      const results: string[] = [];
      for (const skill of output.plan) {
        console.log(`Planning Agent: Executing skill ${skill}...`);
        
        const toolKey = skillMap[skill];
        if (!toolKey) {
          throw new Error(`Unknown skill: ${skill}`);
        }
        
        const tool = simulationTools[toolKey];
        const result = await tool.invoke("");
        
        console.log(`Planning Agent: Result of ${skill}:`, result);
        results.push(`${skill}: ${result}`);
      }
      
      return {
        results,
        explanation: output.explanation,
        plan: output.plan
      };
    } catch (error) {
      console.error("Planning Agent: Error executing plan:", error);
      throw error;
    }
  };
} 