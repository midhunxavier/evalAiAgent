import type { SimulationStateType } from '../page';

// Shared simulation state (would be in a database in a real app)
export const simulationState: SimulationStateType = {
  rotatingArmPosition: 'right',
  rotatingArm2Position: 'right',
  isHoldingWorkpiece: false,
  isArm2HoldingWorkpiece: false,
  magazineWorkpieceCount: 0,
  workpiecePushed: false,
  pusher1Active: false,
  pusher2Active: false,
  status: 'idle',
  logs: []
}; 