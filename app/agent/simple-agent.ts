import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { type SimulationToolSet } from "./tools";

/**
 * Schema for the simple agent's output
 */
const simpleAgentOutputSchema = z.object({
  skill: z.enum([
    "move_to_left_skill",
    "move_to_right_skill",
    "pick_workpiece_skill",
    "place_workpiece_skill",
    "push_workpiece_skill",
    "load_magazine_skill"
  ]).describe("The best skill to execute"),
  explanation: z.string().describe("A brief explanation of why this skill was chosen")
});

type SimpleAgentOutput = z.infer<typeof simpleAgentOutputSchema>;

/**
 * Creates a simple agent that directly executes a skill without planning
 * @param simulationTools The simulation tools to use
 * @returns A function that takes a query and returns a result
 */
export function createSimpleAgent(simulationTools: SimulationToolSet) {
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

Based on the following user request, identify the SINGLE BEST skill to execute:
"{query}"

DO NOT create a plan or sequence of skills. Only identify THE ONE BEST skill to execute right now.
You MUST respond with a JSON object containing both a "skill" (one of the six skills listed above) and an "explanation" for why you chose that skill.
`);

  // Create the model with structured output
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
  }).withStructuredOutput(simpleAgentOutputSchema);

  // Create the inference chain
  const chain = promptTemplate.pipe(model);

  // Return a function that executes the skill
  return async (query: string): Promise<{ result: string; explanation: string; selectedSkill: string }> => {
    try {
      console.log("Simple Agent: Processing query:", query);
      
      // Get the skill to execute
      const output = await chain.invoke({ query });
      console.log("Simple Agent: Identified skill:", output.skill);
      
      // Map the skill name to the corresponding tool
      const skillMap: Record<string, keyof SimulationToolSet> = {
        "move_to_left_skill": "arm1MoveToLeftSkill",
        "move_to_right_skill": "arm1MoveToRightSkill",
        "pick_workpiece_skill": "arm1PickWorkpieceSkill",
        "place_workpiece_skill": "arm1PlaceWorkpieceSkill",
        "push_workpiece_skill": "pusher1PushSlowWorkpieceSkill",
        "load_magazine_skill": "loadMagazineSkill"
      };
      
      const toolKey = skillMap[output.skill];
      if (!toolKey) {
        throw new Error(`Unknown skill: ${output.skill}`);
      }
      
      // Execute the skill
      const tool = simulationTools[toolKey];
      const result = await tool.invoke("");
      
      return {
        result,
        explanation: output.explanation,
        selectedSkill: output.skill
      };
    } catch (error) {
      console.error("Simple Agent: Error executing skill:", error);
      throw error;
    }
  };
} 