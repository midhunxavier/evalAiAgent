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
      case 'move_to_left_skill':
        simulationState.rotatingArmPosition = 'left';
        message = 'Arm moved to the left position';
        break;
        
      case 'move_to_right_skill':
        simulationState.rotatingArmPosition = 'right';
        message = 'Arm moved to the right position';
        break;
        
      case 'pick_workpiece_skill':
        if (simulationState.rotatingArmPosition !== 'left') {
          success = false;
          message = 'Error: Arm must be in left position to pick';
        } else if (!simulationState.workpiecePushed) {
          success = false;
          message = 'Error: No workpiece available to pick';
        } else {
          simulationState.isHoldingWorkpiece = true;
          simulationState.workpiecePushed = false;
          message = 'Workpiece picked by arm';
        }
        break;
        
      case 'place_workpiece_skill':
        if (simulationState.rotatingArmPosition !== 'right') {
          success = false;
          message = 'Error: Arm must be in right position to place';
        } else if (!simulationState.isHoldingWorkpiece) {
          success = false;
          message = 'Error: No workpiece is being held';
        } else {
          simulationState.isHoldingWorkpiece = false;
          message = 'Workpiece placed';
        }
        break;
        
      case 'push_workpiece_skill':
        if (simulationState.magazineWorkpieceCount <= 0) {
          success = false;
          message = 'Error: Magazine is empty';
        } else if (simulationState.workpiecePushed) {
          success = false;
          message = 'Error: Workpiece already pushed';
        } else {
          simulationState.workpiecePushed = true;
          simulationState.magazineWorkpieceCount--;
          message = 'Workpiece pushed from magazine';
        }
        break;
        
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