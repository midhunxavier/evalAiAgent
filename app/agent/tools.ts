import { DynamicTool } from "@langchain/core/tools";
import { executeApi } from "../services/api";

/**
 * Represents a set of simulation tools for interacting with a factory simulation
 */
export interface SimulationToolSet {
  moveToLeftSkill: DynamicTool;
  moveToRightSkill: DynamicTool;
  pickWorkpieceSkill: DynamicTool;
  placeWorkpieceSkill: DynamicTool;
  pushWorkpieceSkill: DynamicTool;
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
    moveToLeftSkill: new DynamicTool({
      name: "Move_to_left_skill",
      description: "Moves the arm to the left (toward magazine). Use this when you need to position the arm to pick a workpiece.",
      func: async (input: string) => {
        try {
          console.log("Executing move_to_left_skill with input:", input);
          // Call the provided executeSkill function to trigger the visual update
          return await executeSkill("move_to_left_skill");
        } catch (error) {
          console.error("Error executing move_to_left_skill:", error);
          throw error;
        }
      },
    }),

    moveToRightSkill: new DynamicTool({
      name: "Move_to_right_skill",
      description: "Moves the arm to the right. Use this when you need to position the arm to place a workpiece.",
      func: async (input: string) => {
        try {
          console.log("Executing move_to_right_skill with input:", input);
          // Call the provided executeSkill function to trigger the visual update
          return await executeSkill("move_to_right_skill");
        } catch (error) {
          console.error("Error executing move_to_right_skill:", error);
          throw error;
        }
      },
    }),

    pickWorkpieceSkill: new DynamicTool({
      name: "Pick_workpiece_skill",
      description: "Picks the workpiece (must be pushed first and arm must be in left position). Use this to grab a workpiece from the left conveyor.",
      func: async (input: string) => {
        try {
          console.log("Executing pick_workpiece_skill with input:", input);
          // Call the provided executeSkill function to trigger the visual update
          return await executeSkill("pick_workpiece_skill");
        } catch (error) {
          console.error("Error executing pick_workpiece_skill:", error);
          throw error;
        }
      },
    }),

    placeWorkpieceSkill: new DynamicTool({
      name: "Place_workpiece_skill",
      description: "Places the workpiece (arm must be in right position). Use this to release a workpiece onto the right conveyor.",
      func: async (input: string) => {
        try {
          console.log("Executing place_workpiece_skill with input:", input);
          // Call the provided executeSkill function to trigger the visual update
          return await executeSkill("place_workpiece_skill");
        } catch (error) {
          console.error("Error executing place_workpiece_skill:", error);
          throw error;
        }
      },
    }),

    pushWorkpieceSkill: new DynamicTool({
      name: "Push_Workpiece_Skill",
      description: "Pushes a workpiece from magazine (magazine must have workpieces). Use this to move a workpiece from the magazine to the left conveyor.",
      func: async (input: string) => {
        try {
          console.log("Executing push_workpiece_skill with input:", input);
          // Call the provided executeSkill function to trigger the visual update
          return await executeSkill("push_workpiece_skill");
        } catch (error) {
          console.error("Error executing push_workpiece_skill:", error);
          throw error;
        }
      },
    }),

    loadMagazineSkill: new DynamicTool({
      name: "Load_Magazine_Skill",
      description: "Loads 6 workpieces into the magazine. Use this when the magazine is empty and you need more workpieces.",
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