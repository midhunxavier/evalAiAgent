import { createPlanningAgent } from './planning-agent';
import { SimulationToolSet } from './tools';
import { DynamicTool } from '@langchain/core/tools';

// Add Jest type declarations
import type { Mock } from 'jest-mock';

// Mock the ChatOpenAI to return predefined responses without making API calls
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return {
        withStructuredOutput: jest.fn().mockImplementation(() => {
          return {
            invoke: jest.fn().mockResolvedValue({
              plan: ['load_magazine_skill', 'push_workpiece_skill', 'move_to_left_skill', 'pick_workpiece_skill', 'move_to_right_skill', 'place_workpiece_skill'],
              explanation: 'Test plan explanation'
            })
          };
        })
      };
    })
  };
});

// Mock for the simulation tools
const createMockSimulationTools = (): SimulationToolSet => {
  const mockExecute = jest.fn().mockResolvedValue('Mock execution successful');
  
  return {
    moveToLeftSkill: new DynamicTool({
      name: 'Move_to_left_skill',
      description: 'Moves the arm to the left',
      func: mockExecute,
    }),
    moveToRightSkill: new DynamicTool({
      name: 'Move_to_right_skill',
      description: 'Moves the arm to the right',
      func: mockExecute,
    }),
    pickWorkpieceSkill: new DynamicTool({
      name: 'Pick_workpiece_skill',
      description: 'Picks a workpiece',
      func: mockExecute,
    }),
    placeWorkpieceSkill: new DynamicTool({
      name: 'Place_workpiece_skill',
      description: 'Places a workpiece',
      func: mockExecute,
    }),
    pushWorkpieceSkill: new DynamicTool({
      name: 'Push_workpiece_skill',
      description: 'Pushes a workpiece',
      func: mockExecute,
    }),
    loadMagazineSkill: new DynamicTool({
      name: 'Load_magazine_skill',
      description: 'Loads the magazine',
      func: mockExecute,
    }),
  };
};

describe('Planning Agent', () => {
  let mockSimulationTools: SimulationToolSet;
  
  beforeEach(() => {
    mockSimulationTools = createMockSimulationTools();
    
    // Clear call counts for all mock functions
    Object.values(mockSimulationTools).forEach(tool => {
      (tool.func as jest.Mock).mockClear();
    });
  });
  
  test('should generate and execute a plan', async () => {
    // Create the planning agent with mock tools
    const planningAgent = createPlanningAgent(mockSimulationTools);
    
    // Define a mock system state
    const mockSystemState = `
      Rotating Arm Position: right
      Holding Workpiece: No
      Magazine Workpiece Count: 0
      Workpiece Pushed: No
      Status: idle
    `;
    
    // Call the agent with a test query
    const result = await planningAgent('Transfer a workpiece to the right conveyor', mockSystemState);
    
    // Verify the result structure
    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('plan');
    
    // Verify the explanation is passed through
    expect(result.explanation).toBe('Test plan explanation');
    
    // Verify the plan contains the expected skills
    expect(result.plan).toEqual([
      'load_magazine_skill',
      'push_workpiece_skill',
      'move_to_left_skill',
      'pick_workpiece_skill',
      'move_to_right_skill',
      'place_workpiece_skill'
    ]);
    
    // Verify all tools in the plan were executed
    expect(mockSimulationTools.loadMagazineSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.pushWorkpieceSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.moveToLeftSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.pickWorkpieceSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.moveToRightSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.placeWorkpieceSkill.func).toHaveBeenCalledTimes(1);
  });

  test('should handle errors during plan execution', async () => {
    // Make one of the tools throw an error
    (mockSimulationTools.pickWorkpieceSkill.func as jest.Mock).mockRejectedValueOnce(
      new Error('Mock execution error')
    );
    
    // Create the planning agent with mock tools
    const planningAgent = createPlanningAgent(mockSimulationTools);
    
    // Define a mock system state
    const mockSystemState = `
      Rotating Arm Position: right
      Holding Workpiece: No
      Magazine Workpiece Count: 0
      Workpiece Pushed: No
      Status: idle
    `;
    
    // Call the agent with a test query and expect it to throw
    await expect(
      planningAgent('Transfer a workpiece to the right conveyor', mockSystemState)
    ).rejects.toThrow('Mock execution error');
    
    // Verify tools before the error were called
    expect(mockSimulationTools.loadMagazineSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.pushWorkpieceSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.moveToLeftSkill.func).toHaveBeenCalledTimes(1);
    expect(mockSimulationTools.pickWorkpieceSkill.func).toHaveBeenCalledTimes(1);
    
    // Verify tools after the error were not called
    expect(mockSimulationTools.moveToRightSkill.func).not.toHaveBeenCalled();
    expect(mockSimulationTools.placeWorkpieceSkill.func).not.toHaveBeenCalled();
  });
}); 