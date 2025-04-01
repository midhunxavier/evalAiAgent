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

    // Arm 1 skills
    "arm1_move_to_left_skill",
    "arm1_move_to_right_skill",
    "arm1_pick_workpiece_skill",
    "arm1_place_workpiece_skill",
    // Arm 2 skills
    "arm2_move_to_left_skill",
    "arm2_move_to_right_skill",
    "arm2_pick_workpiece_skill",
    "arm2_place_workpiece_skill",
    // Pusher skills
    "pusher1_push_slow_workpiece_skill",
    "pusher2_push_fast_workpiece_skill",
    // Common skill
    "load_magazine_skill"
  ])).describe("The sequence of skills to execute"),
  explanation: z.string().describe("A brief explanation of why this plan was chosen"),
  totalEnergy: z.number().describe("The total energy cost of the plan"),
  totalTime: z.number().describe("The total time cost of the plan"),
  totalWear: z.number().describe("The total wear cost of the plan")
});

type PlanningAgentOutput = z.infer<typeof planningAgentOutputSchema>;

// Available GPT models
export const AVAILABLE_MODELS = {
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
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
You are controlling a factory distributing station with TWO ROTATING ARMS and TWO PUSHERS.

Physical configuration:

- magazine is on the left side of the station
- pusher 1 and pusher 2 are below the magazine so workpiece can be pushed from the magazine to the rotating arms left side.
- Rotating Arm 1 and rotating arm 2 is situated on the right side of the magazine both can pick the workpiece from its left side and place it on the right side.


Available Skills with their Cost Model:
- arm1_move_to_left_skill:  
    rotating arm 1 moves to the left side of the magazine
    Energy: 2, Time: 1.5, Wear: 1
- arm1_move_to_right_skill: 
    rotating arm 1 moves to the right side of it.
    Energy: 2, Time: 1.5, Wear: 1
- arm1_pick_workpiece_skill: 
    rotating arm 1 picks the workpiece from the left side of the magazine
    Energy: 3, Time: 1.5, Wear: 1.5
- arm1_place_workpiece_skill: 
    rotating arm 1 places the workpiece on the right side of it.
    Energy: 3, Time: 1.5, Wear: 1.5

- arm2_move_to_left_skill: 
    rotating arm 2 moves to the left side of the magazine
    Energy: 1, Time: 2, Wear: 0.5
- arm2_move_to_right_skill: 
    rotating arm 2 moves to the right side of the magazine
    Energy: 1, Time: 2, Wear: 0.5
- arm2_pick_workpiece_skill: 
    rotating arm 2 picks the workpiece from the left side of the magazine
    Energy: 2, Time: 2.5, Wear: 1
- arm2_place_workpiece_skill: 
    rotating arm 2 places the workpiece on the right side of it.
    Energy: 2, Time: 2.5, Wear: 1

- pusher1_push_slow_workpiece_skill: 
    pusher 1 pushes the workpiece from  the magazine end to the rotating arms end
    Energy: 1, Time: 3, Wear: 0.5 (automatically retracts after pushing)
- pusher2_push_fast_workpiece_skill: 
    pusher 2 pushes the workpiece from the magazine end to the rotating arms end
    Energy: 2, Time: 2, Wear: 1 (automatically retracts after pushing)

- load_magazine_skill: 
    load the workpiece into the magazine
    Energy: 2, Time: 2, Wear: 0.5

Current State of the System:
{systemState}

Operating Rules:
1. Arms can only pick workpiece whenever the workpiece is pushed and arm is in the left position
2. Arms can only place workpiece when  arm is holding workpiece and arm is in the right position
3. The magazine can hold a maximum of 6 workpieces at a time
5. Each arm can only hold one workpiece at a time
6. Only one workpiece can be pushed from the magazine at a time
8. if there are no workpieces in the magazine, then load_magazine_skill for loading workpieces.
9. if there is a workpiece is pushed then pusher no need to push it again.
10. if arm holding workpiece then it can place workpiece if its in the right position.

According to the current state of the system and operating rules, 
Based on the following user request: "{query}" create an efficient plan of skills to execute:

You MUST respond with a JSON object containing:
1. "plan" (an array of skills to execute in order)
2. "explanation" for why you chose this plan
3. "totalEnergy" - CALCULATE and provide the numeric sum of energy costs for all skills in the plan (e.g., 12, not "2 + 3 + 7")
4. "totalTime" - CALCULATE and provide the numeric sum of time costs for all skills in the plan (e.g., 8.5, not "1.5 + 2 + 5")
5. "totalWear" - CALCULATE and provide the numeric sum of wear costs for all skills in the plan (e.g., 4.5, not "1 + 0.5 + 3")

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
  return async (query: string, systemState: string): Promise<{ 
    results: string[]; 
    explanation: string; 
    plan: string[];
    totalEnergy: number;
    totalTime: number;
    totalWear: number;
  }> => {
    try {
      console.log("Planning Agent: Processing query:", query);
      console.log("Planning Agent: Current system state:", systemState);
      console.log("Planning Agent: Using model:", modelName);
      
      // Get the plan to execute
      const output = await chain.invoke({ query: query ,systemState: systemState});
      console.log("Planning Agent: Generated plan:", output.plan);
      
      // Map the skill names to the corresponding tools
      const skillMap: Record<string, keyof SimulationToolSet> = {

        
        // Arm 1 skills
        "arm1_move_to_left_skill": "arm1MoveToLeftSkill",
        "arm1_move_to_right_skill": "arm1MoveToRightSkill",
        "arm1_pick_workpiece_skill": "arm1PickWorkpieceSkill",
        "arm1_place_workpiece_skill": "arm1PlaceWorkpieceSkill",
        
        // Arm 2 skills
        "arm2_move_to_left_skill": "arm2MoveToLeftSkill",
        "arm2_move_to_right_skill": "arm2MoveToRightSkill",
        "arm2_pick_workpiece_skill": "arm2PickWorkpieceSkill",
        "arm2_place_workpiece_skill": "arm2PlaceWorkpieceSkill",
        
        // Pusher skills
        "pusher1_push_slow_workpiece_skill": "pusher1PushSlowWorkpieceSkill",
        "pusher2_push_fast_workpiece_skill": "pusher2PushFastWorkpieceSkill",
        
        // Common skill
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
        plan: output.plan,
        totalEnergy: output.totalEnergy,
        totalTime: output.totalTime,
        totalWear: output.totalWear
      };
    } catch (error) {
      console.error("Planning Agent: Error executing plan:", error);
      throw error;
    }
  };
} 