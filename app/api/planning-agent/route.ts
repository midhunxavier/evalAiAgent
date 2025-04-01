import { NextRequest, NextResponse } from 'next/server';
import { simulationState } from '../../shared/simulation-state';
import { SimulationStateType } from '../../page';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { AVAILABLE_MODELS, type ModelName } from '../../agent/planning-agent';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import { Schema } from '../../../amplify/data/resource';

// Configure Amplify
try {
  // Try to import amplify outputs if available (sandbox mode)
  try {
    const outputs = require('../../../amplify_outputs.json');
    Amplify.configure(outputs);
    console.log('[API Route] Amplify configured with sandbox outputs');
  } catch (e) {
    // Fallback configuration for non-sandbox environment
    console.log('[API Route] Failed to load amplify_outputs.json, using fallback config');
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: process.env.NEXT_PUBLIC_API_URL || '/api/graphql',
          apiKey: process.env.NEXT_PUBLIC_API_KEY || 'dummy-api-key',
          defaultAuthMode: 'apiKey'
        }
      }
    });
  }
} catch (e) {
  console.error('[API Route] Error configuring Amplify:', e);
}

// Create Amplify Data client for DynamoDB access
let client: ReturnType<typeof generateClient<Schema>> | null = null;
try {
  client = generateClient<Schema>();
  console.log('[API Route] Successfully created Amplify Data client');
} catch (e) {
  console.error('[API Route] Error creating Amplify Data client:', e);
}

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

// In-memory evaluation storage as fallback
let evaluationStore: Array<{
  id: string;
  modelName: string;
  userQuery: string;
  actions: string[];
  isCorrect: boolean;
  explanation: string;
  timestamp: string;
  systemState: string; // Stores the initial system state before skill execution
}> = [];

/**
 * Saves agent evaluation to the database or in-memory store
 * @param modelName The model used for generating the plan
 * @param userQuery The user's original query
 * @param actions The sequence of actions in the plan
 * @param isCorrect Whether the user marked the plan as correct
 * @param explanation The explanation for the plan
 * @param systemState The initial system state before any skills were executed
 * @returns Object with success status, source, and ID
 */
async function saveEvaluation(
  modelName: ModelName, 
  userQuery: string, 
  actions: string[], 
  isCorrect: boolean,
  explanation: string,
  systemState: string // Initial system state before execution
) {
  try {
    const evalData = {
      modelName,
      userQuery,
      actions,
      isCorrect,
      explanation,
      timestamp: new Date().toISOString(),
      systemState,
    };
    
    if (client) {
      try {
        // Try to save to Amplify database
        console.log('[API Route] Saving evaluation to DynamoDB:', evalData);
        const result = await client.models.AgentEvaluation.create(evalData);
        
        if (result && result.data) {
          const savedId = result.data.id || 'unknown';
          console.log('[API Route] Saved evaluation to DynamoDB, ID:', savedId);
          return { success: true, source: 'dynamodb', id: savedId };
        } else {
          console.error('[API Route] Failed to get result from DynamoDB create operation');
          throw new Error('Failed to save to DynamoDB');
        }
      } catch (dbError) {
        console.error('[API Route] Error saving to DynamoDB:', dbError);
        throw dbError; // Allow fallback to in-memory storage
      }
    } else {
      console.log('[API Route] Amplify client not available, using in-memory storage');
      throw new Error('Amplify client not initialized');
    }
  } catch (error) {
    // Fallback to in-memory storage
    const evalId = Math.random().toString(36).substring(2, 11);
    const fallbackData = {
      id: evalId,
      modelName,
      userQuery,
      actions,
      isCorrect,
      explanation,
      timestamp: new Date().toISOString(),
      systemState,
    };
    evaluationStore.push(fallbackData);
    console.log('[API Route] Saved evaluation to in-memory store, ID:', evalId);
    return { success: true, source: 'memory', id: evalId };
  }
}

// API route to get all evaluations
export async function GET(request: NextRequest) {
  // Check if this is specifically for evaluations
  const { searchParams } = new URL(request.url);
  const getEvals = searchParams.get('evaluations');
  
  if (getEvals === 'true') {
    try {
      // Try to get from Amplify database first
      if (client) {
        try {
          const evaluationsData = await client.models.AgentEvaluation.list();
          if (evaluationsData && evaluationsData.data && evaluationsData.data.length > 0) {
            console.log('[API Route] Retrieved', evaluationsData.data.length, 'evaluations from DynamoDB');
            return NextResponse.json({
              success: true,
              data: evaluationsData.data,
              source: 'dynamodb'
            });
          } else {
            console.log('[API Route] No data found in DynamoDB, falling back to in-memory store');
          }
        } catch (dbError) {
          console.error('[API Route] Error fetching from DynamoDB:', dbError);
        }
      } else {
        console.log('[API Route] Amplify client not available, using in-memory store');
      }
      
      // Fallback to in-memory storage
      return NextResponse.json({
        success: true,
        data: evaluationStore,
        source: 'in-memory'
      });
    } catch (error) {
      console.error('[API Route] Error getting evaluations:', error);
      return NextResponse.json({
        success: false,
        error: `Error getting evaluations: ${error}`
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Planning Factory Agent API. Send a POST request with a JSON body containing a "query" field.',
    example: {
      query: 'Transfer a workpiece from the magazine to the right conveyor',
      modelName: Object.keys(AVAILABLE_MODELS)[0]
    },
    availableModels: AVAILABLE_MODELS
  });
}

// API route handler for POST requests
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { query, modelName = "gpt-4o-mini", saveFeedback, isCorrect, systemState } = data;
    
    console.log(`[API Route] Planning Agent API: Received request with query: "${query}", model: ${modelName}`);
    
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: query'
      }, { status: 400 });
    }
    
    // Check if this is just saving feedback without generating a plan
    if (saveFeedback && query && typeof isCorrect === 'boolean' && data.plan) {
      try {
        console.log(`[API Route] Saving feedback with initial system state`);
        const result = await saveEvaluation(
          modelName as ModelName, 
          query, 
          data.plan,
          isCorrect,
          data.explanation || "",
          systemState || formatSystemState(simulationState)
        );
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: "Feedback saved successfully",
            source: result.source,
            id: result.id
          });
        } else {
          throw new Error('Failed to save feedback');
        }
      } catch (error: any) {
        console.error('[API Route] Error saving feedback:', error);
        return NextResponse.json({
          success: false,
          error: `Failed to save feedback: ${error.message || error}`
        }, { status: 500 });
      }
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
        modelName: modelName as ModelName,
        temperature: 0,
        openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
      }).withStructuredOutput(planningAgentOutputSchema);

      // Create the inference chain
      const chain = promptTemplate.pipe(model);
      
      // Generate the plan but don't execute it
      const output = await chain.invoke({ query: query });
      console.log('[API Route] Planning Agent API: Generated plan:', output.plan);
      
      return NextResponse.json({
        success: true,
        plan: output.plan,
        explanation: output.explanation || "Unable to determine explanation",
        modelName
      });
    } catch (error: any) {
      console.error('[API Route] Planning Agent API: Error generating plan:', error);
      
      return NextResponse.json({
        success: false,
        error: `Failed to generate plan: ${error.message || error}`,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[API Route] Planning Agent API: Error processing request:', error);
    
    return NextResponse.json({
      success: false,
      error: `Error processing request: ${error.message || error}`
    }, { status: 500 });
  }
} 