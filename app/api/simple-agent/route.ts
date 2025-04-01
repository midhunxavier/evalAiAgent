import { NextRequest, NextResponse } from 'next/server';
import { createSimpleAgent } from '../../agent/simple-agent';
import { createSimulationTools } from '../../agent/tools';
import { executeApi } from '../../services/api';
import { type SimulationToolSet } from '../../agent/tools';

// Map skill names to tool keys
const skillMap: Record<string, keyof SimulationToolSet> = {
  "move_to_left_skill": "arm1MoveToLeftSkill",
  "move_to_right_skill": "arm1MoveToRightSkill",
  "pick_workpiece_skill": "arm1PickWorkpieceSkill",
  "place_workpiece_skill": "arm1PlaceWorkpieceSkill",
  "push_workpiece_skill": "pusher1PushSlowWorkpieceSkill",
  "load_magazine_skill": "loadMagazineSkill"
};

// Function to execute skills and update the simulation state
async function executeSkill(skillName: string): Promise<string> {
  try {
    console.log(`Simple Agent API: Executing skill: ${skillName}`);
    
    // Call the API to execute the skill and update the simulation
    const result = await executeApi(skillName as any);
    
    // This will update the visual simulation through the API
    console.log(`Simple Agent API: Skill execution result:`, result);
    
    // Return the result message
    return result.message;
  } catch (error) {
    console.error(`Error executing ${skillName}:`, error);
    return `Error executing ${skillName}: ${error}`;
  }
}

// Create the simulation tools with our executeSkill function
const simulationTools = createSimulationTools(executeSkill);

// Create the simple agent
const simpleAgent = createSimpleAgent(simulationTools);

// API route handler
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { query } = data;
    
    console.log(`Simple Agent API: Received request with query: "${query}"`);
    
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: query'
      }, { status: 400 });
    }
    
    try {
      // Process the query with the simple agent
      const result = await simpleAgent(query);
      console.log("Simple Agent API: Result:", result);
      
      return NextResponse.json({
        success: true,
        skill: result.selectedSkill,
        explanation: result.explanation || "Unable to determine explanation",
        result: result.result
      });
    } catch (agentError: any) {
      console.error("Simple Agent API: Agent execution error:", agentError);
      
      // Check if this is a parsing error (usually means the LLM returned incorrect format)
      const isParsingError = agentError.toString().includes("Failed to parse") || 
                          agentError.toString().includes("is not valid JSON");
      
      if (isParsingError) {
        // If it's a parsing error, we can try to extract the skill from the raw output
        const llmOutput = agentError.llmOutput || "";
        const possibleSkills = [
          "move_to_left_skill",
          "move_to_right_skill",
          "pick_workpiece_skill",
          "place_workpiece_skill",
          "push_workpiece_skill",
          "load_magazine_skill"
        ];
        
        // Check if any skill name is in the raw output
        const matchedSkill = possibleSkills.find(skill => llmOutput.includes(skill));
        
        if (matchedSkill) {
          // If we found a skill, use it
          console.log("Simple Agent API: Recovered skill from parsing error:", matchedSkill);
          
          // Execute the skill directly
          try {
            const toolKey = skillMap[matchedSkill] as keyof SimulationToolSet;
            if (!toolKey || !simulationTools[toolKey]) {
              throw new Error(`Invalid skill mapping for ${matchedSkill}`);
            }
            
            const skillResult = await simulationTools[toolKey].invoke("");
            
            return NextResponse.json({
              success: true,
              skill: matchedSkill,
              explanation: `Executing ${matchedSkill} (recovered from error)`
            });
          } catch (skillError) {
            return NextResponse.json({
              success: false,
              error: `Found skill ${matchedSkill} but failed to execute: ${skillError}`
            }, { status: 500 });
          }
        }
      }
      
      // If we couldn't recover, return the error
      return NextResponse.json({
        success: false,
        error: `Agent execution error: ${agentError}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing simple agent request:', error);
    return NextResponse.json({
      success: false,
      error: `Error processing request: ${error}`
    }, { status: 500 });
  }
}

// Handle GET requests
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Simple Factory Agent API. Send a POST request with a JSON body containing a "query" field.',
    example: {
      query: 'Move the arm to the left'
    }
  });
} 