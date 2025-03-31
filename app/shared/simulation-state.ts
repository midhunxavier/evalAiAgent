import type { SimulationStateType } from '../page';

// Shared simulation state (would be in a database in a real app)
export const simulationState: SimulationStateType = {
  rotatingArmPosition: 'right',
  isHoldingWorkpiece: false,
  magazineWorkpieceCount: 0,
  workpiecePushed: false,
  status: 'idle',
  logs: []
}; 