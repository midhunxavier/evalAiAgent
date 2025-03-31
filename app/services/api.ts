import axios from 'axios';

// In a real application, this would point to your actual API endpoint
const API_BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';

// Define basic skills types
export type SkillName = 
  | 'move_to_left_skill'
  | 'move_to_right_skill'
  | 'pick_workpiece_skill'
  | 'place_workpiece_skill'
  | 'push_workpiece_skill'
  | 'load_magazine_skill'

export type ApiResponse = {
  success: boolean;
  message: string;
  simulationState?: any;
};

// Simulation function to mock API calls
const simulateApiCall = (
  skillName: SkillName,
  successProbability = 0.95
): Promise<ApiResponse> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      const success = Math.random() < successProbability;
      
      if (success) {
        resolve({
          success: true,
          message: `Successfully executed ${skillName}`,
        });
      } else {
        resolve({
          success: false,
          message: `Failed to execute ${skillName}: Simulated API failure`,
        });
      }
    }, 500); // 500ms delay to simulate network
  });
};

// Execute API calls to control the machine
export const executeApi = async (
  skillName: SkillName
): Promise<ApiResponse> => {
  try {
    console.log(`API: Executing ${skillName}`);
    
    // First, try to use the REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/skills`, {
        skill: skillName
      });
      
      console.log(`API: ${skillName} REST result:`, response.data);
      return response.data;
    } catch (apiError) {
      console.warn(`API: REST API call failed, falling back to simulation:`, apiError);
      // Fall back to simulation if the API is not available
      const result = await simulateApiCall(skillName);
      console.log(`API: ${skillName} simulation result:`, result);
      return result;
    }
  } catch (error) {
    console.error(`API: Error executing ${skillName}:`, error);
    return {
      success: false,
      message: `Error executing ${skillName}: ${error}`,
    };
  }
};

// Get the current state of the simulation from the server
export const getSimulationState = async (): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/simulation-state`);
    return response.data.simulationState;
  } catch (error) {
    console.error('Error fetching simulation state:', error);
    return null;
  }
}; 