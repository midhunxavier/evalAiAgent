// Server-side simulation state store

export interface SimulationStateType {
  rotatingArmPosition: 'left' | 'right';
  isHoldingWorkpiece: boolean;
  magazineWorkpieceCount: number;
  workpiecePushed: boolean;
  status: string;
  lastUpdated: string;
  lastAction: string;
}

// Initialize with default values
let simulationState: SimulationStateType = {
  rotatingArmPosition: 'right',
  isHoldingWorkpiece: false,
  magazineWorkpieceCount: 0,
  workpiecePushed: false,
  status: 'System ready. Load the magazine to begin.',
  lastUpdated: new Date().toISOString(),
  lastAction: 'System initialized'
};

// Get the current simulation state
export function getSimulationState(): SimulationStateType {
  return { ...simulationState };
}

// Update the simulation state
export function updateSimulationState(updates: Partial<SimulationStateType>): SimulationStateType {
  simulationState = {
    ...simulationState,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  
  console.log('Server simulation state updated:', simulationState);
  return simulationState;
}

// Process a skill and update the simulation state accordingly
export function processSkill(skillName: string): { success: boolean; message: string; stateUpdates: Partial<SimulationStateType> } {
  const normalizedSkill = skillName.toLowerCase();
  let success = true;
  let message = `Successfully executed ${skillName}`;
  let stateUpdates: Partial<SimulationStateType> = { 
    lastAction: skillName,
    status: 'idle'
  };
  
  // Execute the skill and determine state changes
  switch (normalizedSkill) {
    case 'move_to_left_skill':
      stateUpdates.rotatingArmPosition = 'left';
      break;
      
    case 'move_to_right_skill':
      stateUpdates.rotatingArmPosition = 'right';
      break;
      
    case 'pick_workpiece_skill':
      if (simulationState.rotatingArmPosition !== 'left') {
        success = false;
        message = 'Error: Arm must be in left position to pick workpiece';
      } else if (!simulationState.workpiecePushed) {
        success = false;
        message = 'Error: No workpiece available to pick (must push from magazine first)';
      } else {
        stateUpdates.isHoldingWorkpiece = true;
        stateUpdates.workpiecePushed = false;
      }
      break;
      
    case 'place_workpiece_skill':
      if (simulationState.rotatingArmPosition !== 'right') {
        success = false;
        message = 'Error: Arm must be in right position to place workpiece';
      } else if (!simulationState.isHoldingWorkpiece) {
        success = false;
        message = 'Error: No workpiece is being held';
      } else {
        stateUpdates.isHoldingWorkpiece = false;
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
        stateUpdates.workpiecePushed = true;
        stateUpdates.magazineWorkpieceCount = simulationState.magazineWorkpieceCount - 1;
      }
      break;
      
    case 'load_magazine_skill':
      stateUpdates.magazineWorkpieceCount = 6;
      break;
      
    default:
      success = false;
      message = `Unknown skill: ${skillName}`;
  }
  
  // If the operation was successful, update the simulation state
  if (success) {
    updateSimulationState(stateUpdates);
  }
  
  return { success, message, stateUpdates };
} 