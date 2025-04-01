import { NextRequest, NextResponse } from 'next/server';
import { simulationState } from '../../shared/simulation-state';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { skill } = data;
    
    console.log(`Skills API: Received request to execute skill: ${skill}`);
    
    if (!skill) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required parameter: skill' 
      }, { status: 400 });
    }
    
    // Update the simulation state based on the skill
    let message = '';
    let success = true;
    
    switch (skill) {
      // Arm 1 skills
      case 'arm1_move_to_left_skill':
        simulationState.rotatingArmPosition = 'left';
        message = 'Arm 1 moved to the left position';
        break;
        
      case 'arm1_move_to_right_skill':
        simulationState.rotatingArmPosition = 'right';
        message = 'Arm 1 moved to the right position';
        break;
        
      case 'arm1_pick_workpiece_skill':
        if (simulationState.rotatingArmPosition !== 'left') {
          success = false;
          message = 'Error: Arm 1 must be in left position to pick';
        } else if (!simulationState.workpiecePushed) {
          success = false;
          message = 'Error: No workpiece available for Arm 1 to pick';
        } else {
          simulationState.isHoldingWorkpiece = true;
          simulationState.workpiecePushed = false;
          message = 'Workpiece picked by Arm 1';
        }
        break;
        
      case 'arm1_place_workpiece_skill':
        if (simulationState.rotatingArmPosition !== 'right') {
          success = false;
          message = 'Error: Arm 1 must be in right position to place';
        } else if (!simulationState.isHoldingWorkpiece) {
          success = false;
          message = 'Error: Arm 1 is not holding a workpiece';
        } else {
          simulationState.isHoldingWorkpiece = false;
          message = 'Workpiece placed by Arm 1';
        }
        break;
      
      // Arm 2 skills
      case 'arm2_move_to_left_skill':
        simulationState.rotatingArm2Position = 'left';
        message = 'Arm 2 moved to the left position';
        break;
        
      case 'arm2_move_to_right_skill':
        simulationState.rotatingArm2Position = 'right';
        message = 'Arm 2 moved to the right position';
        break;
        
      case 'arm2_pick_workpiece_skill':
        if (simulationState.rotatingArm2Position !== 'left') {
          success = false;
          message = 'Error: Arm 2 must be in left position to pick';
        } else if (!simulationState.workpiecePushed) {
          success = false;
          message = 'Error: No workpiece available for Arm 2 to pick';
        } else {
          simulationState.isArm2HoldingWorkpiece = true;
          simulationState.workpiecePushed = false;
          message = 'Workpiece picked by Arm 2';
        }
        break;
        
      case 'arm2_place_workpiece_skill':
        if (simulationState.rotatingArm2Position !== 'right') {
          success = false;
          message = 'Error: Arm 2 must be in right position to place';
        } else if (!simulationState.isArm2HoldingWorkpiece) {
          success = false;
          message = 'Error: Arm 2 is not holding a workpiece';
        } else {
          simulationState.isArm2HoldingWorkpiece = false;
          message = 'Workpiece placed by Arm 2';
        }
        break;
      
      // Pusher skills
      case 'pusher1_push_slow_workpiece_skill':
        if (simulationState.magazineWorkpieceCount <= 0) {
          success = false;
          message = 'Error: Magazine is empty';
        } else if (simulationState.workpiecePushed) {
          success = false;
          message = 'Error: Workpiece already pushed';
        } else {
          simulationState.workpiecePushed = true;
          simulationState.pusher1Active = true;
          simulationState.magazineWorkpieceCount--;
          message = 'Workpiece pushed slowly from magazine by Pusher 1';
          
          // Schedule pusher retraction
          setTimeout(() => {
            simulationState.pusher1Active = false;
            console.log("API: Pusher 1 retracted");
          }, 1000);
        }
        break;
        
      case 'pusher2_push_fast_workpiece_skill':
        if (simulationState.magazineWorkpieceCount <= 0) {
          success = false;
          message = 'Error: Magazine is empty';
        } else if (simulationState.workpiecePushed) {
          success = false;
          message = 'Error: Workpiece already pushed';
        } else {
          simulationState.workpiecePushed = true;
          simulationState.pusher2Active = true;
          simulationState.magazineWorkpieceCount--;
          message = 'Workpiece pushed quickly from magazine by Pusher 2';
          
          // Schedule pusher retraction
          setTimeout(() => {
            simulationState.pusher2Active = false;
            console.log("API: Pusher 2 retracted");
          }, 800);
        }
        break;
        
      // Common skill
      case 'load_magazine_skill':
        simulationState.magazineWorkpieceCount = 6;
        message = 'Magazine loaded with 6 workpieces';
        break;
      
      default:
        success = false;
        message = `Unknown skill: ${skill}`;
    }
    
    // Update status
    simulationState.status = success ? 'idle' : 'error';
    
    // Add to logs
    simulationState.logs = [message, ...simulationState.logs].slice(0, 50);
    
    console.log(`Skills API: Execution ${success ? 'successful' : 'failed'}: ${message}`);
    console.log(`Skills API: Updated simulation state:`, simulationState);
    
    return NextResponse.json({
      success,
      message,
      simulationState
    });
  } catch (error) {
    console.error('Error executing skill:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error executing skill: ${error}` 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Skills API endpoint. Send a POST request with a skill name to execute.',
    example: {
      skill: 'move_to_left_skill'
    }
  });
} 