import { DynamicTool } from "@langchain/core/tools";
import { executeApi } from "../services/api";

/**
 * Represents a set of simulation tools for interacting with a factory simulation
 */
export interface SimulationToolSet {
  // Arm 1 skills
  arm1MoveToLeftSkill: DynamicTool;
  arm1MoveToRightSkill: DynamicTool;
  arm1PickWorkpieceSkill: DynamicTool;
  arm1PlaceWorkpieceSkill: DynamicTool;
  
  // Arm 2 skills
  arm2MoveToLeftSkill: DynamicTool;
  arm2MoveToRightSkill: DynamicTool;
  arm2PickWorkpieceSkill: DynamicTool;
  arm2PlaceWorkpieceSkill: DynamicTool;
  
  // Pusher skills
  pusher1PushSlowWorkpieceSkill: DynamicTool;
  pusher2PushFastWorkpieceSkill: DynamicTool;
  
  // Common skill
  loadMagazineSkill: DynamicTool;
}

/**
 * Creates simulation tools using the provided execution function
 * @param executeSkill Function to execute a skill in the simulation
 * @returns A set of simulation tools
 */
export function createSimulationTools(
  executeSkill: (skillName: string) => Promise<string>
): SimulationToolSet {
  return {    
    // Arm 1 skills
    arm1MoveToLeftSkill: new DynamicTool({
      name: "Arm1_Move_to_left_skill",
      description: "Moves arm 1 to the left (toward magazine). Energy: 2, Time: 1.5, Wear: 1.",
      func: async (input: string) => {
        try {
          console.log("Executing arm1_move_to_left_skill with input:", input);
          return await executeSkill("arm1_move_to_left_skill");
        } catch (error) {
          console.error("Error executing arm1_move_to_left_skill:", error);
          throw error;
        }
      },
    }),

    arm1MoveToRightSkill: new DynamicTool({
      name: "Arm1_Move_to_right_skill",
      description: "Moves arm 1 to the right. Energy: 2, Time: 1.5, Wear: 1.",
      func: async (input: string) => {
        try {
          console.log("Executing arm1_move_to_right_skill with input:", input);
          return await executeSkill("arm1_move_to_right_skill");
        } catch (error) {
          console.error("Error executing arm1_move_to_right_skill:", error);
          throw error;
        }
      },
    }),

    arm1PickWorkpieceSkill: new DynamicTool({
      name: "Arm1_Pick_workpiece_skill",
      description: "Arm 1 picks the workpiece (must be pushed first and arm must be in left position). Energy: 3, Time: 1.5, Wear: 1.5.",
      func: async (input: string) => {
        try {
          console.log("Executing arm1_pick_workpiece_skill with input:", input);
          return await executeSkill("arm1_pick_workpiece_skill");
        } catch (error) {
          console.error("Error executing arm1_pick_workpiece_skill:", error);
          throw error;
        }
      },
    }),

    arm1PlaceWorkpieceSkill: new DynamicTool({
      name: "Arm1_Place_workpiece_skill",
      description: "Arm 1 places the workpiece (arm must be in right position). Energy: 3, Time: 1.5, Wear: 1.5.",
      func: async (input: string) => {
        try {
          console.log("Executing arm1_place_workpiece_skill with input:", input);
          return await executeSkill("arm1_place_workpiece_skill");
        } catch (error) {
          console.error("Error executing arm1_place_workpiece_skill:", error);
          throw error;
        }
      },
    }),
    
    // Arm 2 skills
    arm2MoveToLeftSkill: new DynamicTool({
      name: "Arm2_Move_to_left_skill",
      description: "Moves arm 2 to the left (toward magazine). Energy: 1, Time: 2, Wear: 0.5.",
      func: async (input: string) => {
        try {
          console.log("Executing arm2_move_to_left_skill with input:", input);
          return await executeSkill("arm2_move_to_left_skill");
        } catch (error) {
          console.error("Error executing arm2_move_to_left_skill:", error);
          throw error;
        }
      },
    }),

    arm2MoveToRightSkill: new DynamicTool({
      name: "Arm2_Move_to_right_skill",
      description: "Moves arm 2 to the right. Energy: 1, Time: 2, Wear: 0.5.",
      func: async (input: string) => {
        try {
          console.log("Executing arm2_move_to_right_skill with input:", input);
          return await executeSkill("arm2_move_to_right_skill");
        } catch (error) {
          console.error("Error executing arm2_move_to_right_skill:", error);
          throw error;
        }
      },
    }),

    arm2PickWorkpieceSkill: new DynamicTool({
      name: "Arm2_Pick_workpiece_skill",
      description: "Arm 2 picks the workpiece (must be pushed first and arm must be in left position). Energy: 2, Time: 2.5, Wear: 1.",
      func: async (input: string) => {
        try {
          console.log("Executing arm2_pick_workpiece_skill with input:", input);
          return await executeSkill("arm2_pick_workpiece_skill");
        } catch (error) {
          console.error("Error executing arm2_pick_workpiece_skill:", error);
          throw error;
        }
      },
    }),

    arm2PlaceWorkpieceSkill: new DynamicTool({
      name: "Arm2_Place_workpiece_skill",
      description: "Arm 2 places the workpiece (arm must be in right position). Energy: 2, Time: 2.5, Wear: 1.",
      func: async (input: string) => {
        try {
          console.log("Executing arm2_place_workpiece_skill with input:", input);
          return await executeSkill("arm2_place_workpiece_skill");
        } catch (error) {
          console.error("Error executing arm2_place_workpiece_skill:", error);
          throw error;
        }
      },
    }),
    
    // Pusher skills
    pusher1PushSlowWorkpieceSkill: new DynamicTool({
      name: "Pusher1_Push_Slow_Workpiece_Skill",
      description: "Pusher 1 slowly pushes a workpiece from magazine (magazine must have workpieces). Energy: 1, Time: 3, Wear: 0.5.",
      func: async (input: string) => {
        try {
          console.log("Executing pusher1_push_slow_workpiece_skill with input:", input);
          return await executeSkill("pusher1_push_slow_workpiece_skill");
        } catch (error) {
          console.error("Error executing pusher1_push_slow_workpiece_skill:", error);
          throw error;
        }
      },
    }),

    pusher2PushFastWorkpieceSkill: new DynamicTool({
      name: "Pusher2_Push_Fast_Workpiece_Skill",
      description: "Pusher 2 quickly pushes a workpiece from magazine (magazine must have workpieces). Energy: 2, Time: 2, Wear: 1.",
      func: async (input: string) => {
        try {
          console.log("Executing pusher2_push_fast_workpiece_skill with input:", input);
          return await executeSkill("pusher2_push_fast_workpiece_skill");
        } catch (error) {
          console.error("Error executing pusher2_push_fast_workpiece_skill:", error);
          throw error;
        }
      },
    }),
    
    // Common skill
    loadMagazineSkill: new DynamicTool({
      name: "Load_Magazine_Skill",
      description: "Loads 6 workpieces into the magazine. Use this when the magazine is empty and you need more workpieces. Energy: 2, Time: 2, Wear: 0.5.",
      func: async (input: string) => {
        try {
          console.log("Executing load_magazine_skill with input:", input);
          // Call the provided executeSkill function to trigger the visual update
          return await executeSkill("load_magazine_skill");
        } catch (error) {
          console.error("Error executing load_magazine_skill:", error);
          throw error;
        }
      },
    }),
  };
} 