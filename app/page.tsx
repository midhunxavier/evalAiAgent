'use client'

import { useState, useCallback, useEffect } from 'react'
import Simulation from './components/Simulation'
import ControlPanel from './components/ControlPanel'
import SimulationLog from './components/SimulationLog'
import SimpleAgentChat from './components/SimpleAgentChat'
import PlanningAgentChat from './components/PlanningAgentChat'
import SkillCostTable from './components/SkillCostTable'
import { executeApi } from '@/app/services/api'
import styles from './page.module.css'

export interface SimulationStateType {
  rotatingArmPosition: 'left' | 'right'
  rotatingArm2Position: 'left' | 'right'
  isHoldingWorkpiece: boolean
  isArm2HoldingWorkpiece: boolean
  magazineWorkpieceCount: number
  workpiecePushed: boolean
  pusher1Active: boolean
  pusher2Active: boolean
  status: string
  logs: string[]
}

export default function Home() {
  const [simulationState, setSimulationState] = useState<SimulationStateType>({
    rotatingArmPosition: 'right',
    rotatingArm2Position: 'right',
    isHoldingWorkpiece: false,
    isArm2HoldingWorkpiece: false,
    magazineWorkpieceCount: 0,
    workpiecePushed: false,
    pusher1Active: false,
    pusher2Active: false,
    status: 'System ready. Load the magazine to begin.',
    logs: []
  })

  // Load saved state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem('simulationState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setSimulationState(prevState => ({
          ...prevState,
          ...parsedState,
          logs: prevState.logs // Keep existing logs
        }));
        console.log('Loaded saved state from localStorage');
      } catch (e) {
        console.error('Error parsing saved state:', e);
      }
    }
  }, []);

  const [showAgent, setShowAgent] = useState<'none' | 'planning'>('planning')

  const addLog = useCallback((message: string) => {
    setSimulationState(prevState => ({
      ...prevState,
      logs: [message, ...prevState.logs].slice(0, 50)
    }))
  }, [])

  const updateSimulationState = useCallback((newState: Partial<SimulationStateType>) => {
    setSimulationState(prevState => {
      const updatedState = {
        ...prevState,
        ...newState
      }

      // Save state to localStorage (excluding logs to keep it smaller)
      const stateToSave = { ...updatedState };
      const stateForStorage = { ...stateToSave };
      delete (stateForStorage as any).logs;
      localStorage.setItem('simulationState', JSON.stringify(stateForStorage));

      // Log state changes
      if (newState.rotatingArmPosition && newState.rotatingArmPosition !== prevState.rotatingArmPosition) {
        addLog(`Arm moved to ${newState.rotatingArmPosition} position`)
      }
      if (newState.isHoldingWorkpiece !== undefined && newState.isHoldingWorkpiece !== prevState.isHoldingWorkpiece) {
        if (newState.isHoldingWorkpiece) {
          addLog('Workpiece picked by arm')
        } else if (prevState.isHoldingWorkpiece) {
          addLog('Workpiece placed')
        }
      }
      if (newState.magazineWorkpieceCount !== undefined && 
          newState.magazineWorkpieceCount !== prevState.magazineWorkpieceCount) {
        if (newState.magazineWorkpieceCount > prevState.magazineWorkpieceCount) {
          addLog(`Magazine loaded with ${newState.magazineWorkpieceCount} workpieces`)
        } else if (newState.magazineWorkpieceCount < prevState.magazineWorkpieceCount) {
          addLog('Workpiece unloaded from magazine')
        }
      }
      if (newState.workpiecePushed !== undefined && 
          newState.workpiecePushed !== prevState.workpiecePushed) {
        if (newState.workpiecePushed) {
          addLog('Workpiece pushed from magazine')
        } else {
          addLog('Workpiece pushed back to magazine')
        }
      }
      if (newState.status && newState.status !== prevState.status) {
        addLog(`Status changed to: ${newState.status}`)
      }

      return updatedState
    })
  }, [addLog])

  // Function to execute skills via API
  const executeSkill = async (skillName: string): Promise<string> => {
    try {
      addLog(`Executing skill: ${skillName}`)
      setSimulationState(prevState => ({ ...prevState, status: 'busy' }))
      
      const normalizedSkillName = skillName.toLowerCase()
      const result = await executeApi(normalizedSkillName as any)
      
      // If the API returned a simulation state, use it directly
      if (result.simulationState) {
        // Map server state to client state
        updateSimulationState({
          rotatingArmPosition: result.simulationState.rotatingArmPosition,
          rotatingArm2Position: result.simulationState.rotatingArm2Position,
          isHoldingWorkpiece: result.simulationState.isHoldingWorkpiece,
          isArm2HoldingWorkpiece: result.simulationState.isArm2HoldingWorkpiece,
          magazineWorkpieceCount: result.simulationState.magazineWorkpieceCount,
          workpiecePushed: result.simulationState.workpiecePushed,
          pusher1Active: result.simulationState.pusher1Active,
          pusher2Active: result.simulationState.pusher2Active,
          status: 'idle'
        })
        
        return result.message
      }
      
      // Otherwise, update the state based on the action
      if (result.success) {
        // Update client-side state based on the skill
        switch (normalizedSkillName) {
          // Arm 1 skills
          case 'arm1_move_to_left_skill':
            updateSimulationState({ rotatingArmPosition: 'left' })
            break
          
          case 'arm1_move_to_right_skill':
            updateSimulationState({ rotatingArmPosition: 'right' })
            break
          
          case 'arm1_pick_workpiece_skill':
            if (simulationState.rotatingArmPosition !== 'left') {
              return 'Error: Arm 1 must be in left position to pick'
            }
            if (!simulationState.workpiecePushed) {
              return 'Error: No workpiece available to pick'
            }
            updateSimulationState({ 
              isHoldingWorkpiece: true, 
              workpiecePushed: false 
            })
            break
          
          case 'arm1_place_workpiece_skill':
            if (simulationState.rotatingArmPosition !== 'right') {
              return 'Error: Arm 1 must be in right position to place'
            }
            if (!simulationState.isHoldingWorkpiece) {
              return 'Error: Arm 1 is not holding a workpiece'
            }
            updateSimulationState({ isHoldingWorkpiece: false })
            break
            
          // Arm 2 skills
          case 'arm2_move_to_left_skill':
            updateSimulationState({ rotatingArm2Position: 'left' })
            break
          
          case 'arm2_move_to_right_skill':
            updateSimulationState({ rotatingArm2Position: 'right' })
            break
          
          case 'arm2_pick_workpiece_skill':
            if (simulationState.rotatingArm2Position !== 'left') {
              return 'Error: Arm 2 must be in left position to pick'
            }
            if (!simulationState.workpiecePushed) {
              return 'Error: No workpiece available for Arm 2 to pick'
            }
            updateSimulationState({ 
              isArm2HoldingWorkpiece: true, 
              workpiecePushed: false 
            })
            break
          
          case 'arm2_place_workpiece_skill':
            if (simulationState.rotatingArm2Position !== 'right') {
              return 'Error: Arm 2 must be in right position to place'
            }
            if (!simulationState.isArm2HoldingWorkpiece) {
              return 'Error: Arm 2 is not holding a workpiece'
            }
            updateSimulationState({ isArm2HoldingWorkpiece: false })
            break
            
          // Pusher skills
          case 'pusher1_push_slow_workpiece_skill':
            if (simulationState.magazineWorkpieceCount <= 0) {
              return 'Error: Magazine is empty'
            }
            if (simulationState.workpiecePushed) {
              return 'Error: Workpiece already pushed'
            }
            
            // Activate pusher and update simulation state
            updateSimulationState({ 
              workpiecePushed: true,
              pusher1Active: true,
              magazineWorkpieceCount: simulationState.magazineWorkpieceCount - 1
            });
            
            // Ensure pusher retracts after pushing (after animation delay)
            setTimeout(() => {
              updateSimulationState({ pusher1Active: false });
              console.log("Pusher 1 retracted");
            }, 1000); // Retract after 1 second
            break;
            
          case 'pusher2_push_fast_workpiece_skill':
            if (simulationState.magazineWorkpieceCount <= 0) {
              return 'Error: Magazine is empty'
            }
            if (simulationState.workpiecePushed) {
              return 'Error: Workpiece already pushed'
            }
            
            // Activate pusher and update simulation state
            updateSimulationState({ 
              workpiecePushed: true,
              pusher2Active: true,
              magazineWorkpieceCount: simulationState.magazineWorkpieceCount - 1
            });
            
            // Ensure pusher retracts after pushing (after animation delay)
            setTimeout(() => {
              updateSimulationState({ pusher2Active: false });
              console.log("Pusher 2 retracted");
            }, 800); // Retract faster (800ms) for the fast pusher
            break;
            
          case 'load_magazine_skill':
            updateSimulationState({ magazineWorkpieceCount: 6 })
            break
        }
      }
      
      // Set the status back to idle after operation
      setSimulationState(prevState => ({ ...prevState, status: 'idle' }))
      
      return result.message
    } catch (error) {
      console.error('Error executing skill:', error)
      setSimulationState(prevState => ({ ...prevState, status: 'error' }))
      return `Error executing ${skillName}: ${error}`
    }
  }

  // Function to format system state as a string
  const getCurrentSystemState = useCallback(() => {
    return `
Rotating Arm 1 Position: ${simulationState.rotatingArmPosition}
Arm 1 Holding Workpiece: ${simulationState.isHoldingWorkpiece ? 'Yes' : 'No'}
Rotating Arm 2 Position: ${simulationState.rotatingArm2Position}
Arm 2 Holding Workpiece: ${simulationState.isArm2HoldingWorkpiece ? 'Yes' : 'No'}
Magazine Workpiece Count: ${simulationState.magazineWorkpieceCount}
Workpiece Pushed: ${simulationState.workpiecePushed ? 'Yes' : 'No'}
Pusher 1 Active: ${simulationState.pusher1Active ? 'Yes' : 'No'}
Pusher 2 Active: ${simulationState.pusher2Active ? 'Yes' : 'No'}
Status: ${simulationState.status}
    `.trim();
  }, [simulationState]);

  const renderAgentSelector = () => <></>

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>
        AI Agent for Distributing Station 
      </h1>
      
      <div className={styles.description}>
        <p>
          This simulation represents a factory distributing station with two robotic arms and magazine storage system.
          The station transfers workpieces from a magazine to a delivery position through a series of automated steps.
          Each arm can move between left (magazine) and right (delivery) positions, pick up and place workpieces.
        </p>
        <p>
          Use the Planning Agent to control the system with natural language commands.
        </p>
      </div>
      
      <div className={styles.navigation}>
        <a href="/evaluation" className={styles.evalLink}>View Agent Evaluation Dashboard</a>
      </div>
      
      {renderAgentSelector()}
      
      <div className={styles.simulationContainer}>
        <div className={styles.simulationSection}>
          <Simulation simulationState={simulationState} />
          <SkillCostTable />
        </div>
        
        <div className={styles.agentContainer}>
          <div className={styles.controlsContainer}>
            <PlanningAgentChat 
              executeSkill={executeSkill} 
              getCurrentSystemState={getCurrentSystemState}
            />
            <SimulationLog logs={simulationState.logs} />
          </div>
        </div>
      </div>
    </main>
  )
} 