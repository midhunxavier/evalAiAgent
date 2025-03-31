import { NextRequest, NextResponse } from 'next/server';
import { simulationState } from '../../shared/simulation-state';
import { SimulationStateType } from '../../page';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

// The schema for the planning agent's output
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

// Format system state as a string
function formatSystemState(state: SimulationStateType): string {
  return `
Rotating Arm Position: ${state.rotatingArmPosition}
Holding Workpiece: ${state.isHoldingWorkpiece ? 'Yes' : 'No'}
Magazine Workpiece Count: ${state.magazineWorkpieceCount}
Workpiece Pushed: ${state.workpiecePushed ? 'Yes' : 'No'}
Status: ${state.status}
  `.trim();
}

// API route handler
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { query } = data;
    
    console.log(`Planning Agent API: Received request with query: "${query}"`);
    
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: query'
      }, { status: 400 });
    }
    
    try {
      // Get the current state of the system
      const currentSystemState = formatSystemState(simulationState);
      
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
${currentSystemState}

Based on the following user request, create a plan of skills to execute:
"${query}"

You MUST respond with a JSON object containing a "plan" (an array of skills to execute in order) and an "explanation" for why you chose this plan.
Make sure your plan follows the operating rules and accounts for the current state of the system.
`);

      // Create the model with structured output
      const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
        openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
      }).withStructuredOutput(planningAgentOutputSchema);

      // Create the inference chain
      const chain = promptTemplate.pipe(model);
      
      // Generate the plan but don't execute it
      const output = await chain.invoke({ query: query });
      console.log("Planning Agent API: Generated plan:", output.plan);
      
      return NextResponse.json({
        success: true,
        plan: output.plan,
        explanation: output.explanation || "Unable to determine explanation"
      });
    } catch (error: any) {
      console.error("Planning Agent API: Error generating plan:", error);
      
      return NextResponse.json({
        success: false,
        error: `Failed to generate plan: ${error.message || error}`,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Planning Agent API: Error processing request:", error);
    
    return NextResponse.json({
      success: false,
      error: `Error processing request: ${error.message || error}`
    }, { status: 500 });
  }
}

// Handle GET requests
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Planning Factory Agent API. Send a POST request with a JSON body containing a "query" field.',
    example: {
      query: 'Transfer a workpiece from the magazine to the right conveyor'
    }
  });
} 