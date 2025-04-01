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

// Format system state as a string
function formatSystemState(state: SimulationStateType): string {
  return `
Rotating Arm 1 Position: ${state.rotatingArmPosition}
Arm 1 Holding Workpiece: ${state.isHoldingWorkpiece ? 'Yes' : 'No'}
Rotating Arm 2 Position: ${state.rotatingArm2Position}
Arm 2 Holding Workpiece: ${state.isArm2HoldingWorkpiece ? 'Yes' : 'No'}
Magazine Workpiece Count: ${state.magazineWorkpieceCount}
Workpiece Pushed: ${state.workpiecePushed ? 'Yes' : 'No'}
Pusher 1 Active: ${state.pusher1Active ? 'Yes' : 'No'}
Pusher 2 Active: ${state.pusher2Active ? 'Yes' : 'No'}
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
      // Use the system state provided by the client if available, otherwise use the shared object
      let currentSystemState;
      if (data.systemState) {
        currentSystemState = data.systemState;
        console.log('[API Route] Using system state from client:', currentSystemState);
      } else {
        currentSystemState = formatSystemState(simulationState);
        console.log('[API Route] Using default system state:', currentSystemState);
      }
      
      // Create the prompt template
      const promptTemplate = `
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
${currentSystemState}

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
Based on the following user request: "${query}" create an efficient plan of skills to execute:

You MUST respond with a JSON object containing:
1. "plan" (an array of skills to execute in order)
2. "explanation" for why you chose this plan
3. "totalEnergy" - CALCULATE and provide the numeric sum of energy costs for all skills in the plan (e.g., 12, not "2 + 3 + 7")
4. "totalTime" - CALCULATE and provide the numeric sum of time costs for all skills in the plan (e.g., 8.5, not "1.5 + 2 + 5")
5. "totalWear" - CALCULATE and provide the numeric sum of wear costs for all skills in the plan (e.g., 4.5, not "1 + 0.5 + 3")

Make sure your plan follows the operating rules and accounts for the current state of the system.`;

      // Create the model
      const model = new ChatOpenAI({
        modelName: modelName as any,
        temperature: 0,
        openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
      });

      console.log('[API Route] Prompt:', promptTemplate);

      // Generate the plan
      const response = await model.invoke([
        ["human", promptTemplate]
      ]);

      // Parse the plan from the model's response
      try {
        const contentText = response.content.toString();
        
        // Extract JSON content more robustly
        let jsonContent = contentText;
        
        // Try to extract JSON from markdown code blocks first
        const jsonMatch = contentText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1].trim();
        } 
        // If no code blocks, look for JSON-like structures
        else {
          const possibleJson = contentText.match(/(\{[\s\S]*\})/);
          if (possibleJson && possibleJson[1]) {
            jsonContent = possibleJson[1].trim();
          }
        }
        
        // Sanitize the JSON content to fix common issues
        // Remove trailing commas in arrays or objects which are invalid JSON
        jsonContent = jsonContent.replace(/,(\s*[\]}])/g, '$1');
        
        // Fix expressions in totalEnergy, totalTime, and totalWear
        jsonContent = jsonContent.replace(/"totalEnergy"\s*:\s*([^"{}[\],]+),/g, (match, expr) => {
          try {
            // Safely evaluate the mathematical expression
            const result = Function('return ' + expr)();
            return `"totalEnergy": ${result},`;
          } catch (e) {
            console.error('[API Route] Error evaluating totalEnergy expression:', expr);
            return `"totalEnergy": 0,`;
          }
        });
        
        jsonContent = jsonContent.replace(/"totalTime"\s*:\s*([^"{}[\],]+),/g, (match, expr) => {
          try {
            // Safely evaluate the mathematical expression
            const result = Function('return ' + expr)();
            return `"totalTime": ${result},`;
          } catch (e) {
            console.error('[API Route] Error evaluating totalTime expression:', expr);
            return `"totalTime": 0,`;
          }
        });
        
        jsonContent = jsonContent.replace(/"totalWear"\s*:\s*([^"{}[\],]+)([,}])/g, (match, expr, ending) => {
          try {
            // Safely evaluate the mathematical expression
            const result = Function('return ' + expr)();
            return `"totalWear": ${result}${ending}`;
          } catch (e) {
            console.error('[API Route] Error evaluating totalWear expression:', expr);
            return `"totalWear": 0${ending}`;
          }
        });
        
        // Try to parse the sanitized JSON
        let parsedOutput;
        try {
          parsedOutput = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error('[API Route] Initial JSON parse error:', parseError);
          console.error('[API Route] Problematic JSON:', jsonContent);
          
          // If parsing fails, try to create a simple valid structure with default values
          parsedOutput = {
            plan: [],
            explanation: "Failed to parse the plan. Please try again with a simpler request.",
            totalEnergy: 0,
            totalTime: 0, 
            totalWear: 0
          };
        }
        
        console.log('[API Route] Parsed plan:', parsedOutput);
        
        // Validate the parsed output against the schema
        try {
          const validatedOutput = planningAgentOutputSchema.parse(parsedOutput);
          
          return NextResponse.json({
            success: true,
            plan: validatedOutput.plan,
            explanation: validatedOutput.explanation,
            modelName: modelName,
            totalEnergy: validatedOutput.totalEnergy,
            totalTime: validatedOutput.totalTime,
            totalWear: validatedOutput.totalWear
          });
        } catch (validationError) {
          console.error('[API Route] Validation error:', validationError);
          
          // Return a fallback plan with explicit error
          return NextResponse.json({
            success: false,
            error: `Planning failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
            explanation: "The planning agent was unable to create a valid plan. Try simplifying your request."
          }, { status: 400 });
        }
      } catch (parsingError) {
        console.error('[API Route] Parsing error:', parsingError);
        
        return NextResponse.json({
          success: false, 
          error: `Parsing error: ${parsingError instanceof Error ? parsingError.message : String(parsingError)}`,
          explanation: "There was an error processing the AI response. Please try again with a different wording."
        }, { status: 400 });
      }
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