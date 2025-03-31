'use client'

import { useState, useCallback } from 'react'
import Simulation from './components/Simulation'
import ControlPanel from './components/ControlPanel'
import SimulationLog from './components/SimulationLog'
import SimpleAgentChat from './components/SimpleAgentChat'
import PlanningAgentChat from './components/PlanningAgentChat'
import { executeApi } from './services/api'
import styles from './page.module.css'

export interface SimulationStateType {
  rotatingArmPosition: 'left' | 'right'
  isHoldingWorkpiece: boolean
  magazineWorkpieceCount: number
  workpiecePushed: boolean
  status: string
  logs: string[]
}

export default function Home() {
  const [simulationState, setSimulationState] = useState<SimulationStateType>({
    rotatingArmPosition: 'right',
    isHoldingWorkpiece: false,
    magazineWorkpieceCount: 0,
    workpiecePushed: false,
    status: 'System ready. Load the magazine to begin.',
    logs: []
  })

  const [showAgent, setShowAgent] = useState<'none' | 'simple' | 'planning'>('none')

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
          isHoldingWorkpiece: result.simulationState.isHoldingWorkpiece,
          magazineWorkpieceCount: result.simulationState.magazineWorkpieceCount,
          workpiecePushed: result.simulationState.workpiecePushed,
          status: 'idle'
        })
        
        return result.message
      }
      
      // Otherwise, update the state based on the action
      if (result.success) {
        // Update client-side state based on the skill
        switch (normalizedSkillName) {
          case 'move_to_left_skill':
            updateSimulationState({ rotatingArmPosition: 'left' })
            break
          
          case 'move_to_right_skill':
            updateSimulationState({ rotatingArmPosition: 'right' })
            break
          
          case 'pick_workpiece_skill':
            if (simulationState.rotatingArmPosition !== 'left') {
              return 'Error: Arm must be in left position to pick'
            }
            if (!simulationState.workpiecePushed) {
              return 'Error: No workpiece available to pick'
            }
            updateSimulationState({ 
              isHoldingWorkpiece: true, 
              workpiecePushed: false 
            })
            break
          
          case 'place_workpiece_skill':
            if (simulationState.rotatingArmPosition !== 'right') {
              return 'Error: Arm must be in right position to place'
            }
            if (!simulationState.isHoldingWorkpiece) {
              return 'Error: No workpiece is being held'
            }
            updateSimulationState({ isHoldingWorkpiece: false })
            break
          
          case 'push_workpiece_skill':
            if (simulationState.magazineWorkpieceCount <= 0) {
              return 'Error: Magazine is empty'
            }
            if (simulationState.workpiecePushed) {
              return 'Error: Workpiece already pushed'
            }
            updateSimulationState({ 
              workpiecePushed: true,
              magazineWorkpieceCount: simulationState.magazineWorkpieceCount - 1
            })
            break
          
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

  const renderAgentSelector = () => (
    <div className={styles.agentSelector}>
      <button 
        className={`${styles.agentSelectorButton} ${showAgent === 'none' ? styles.active : ''}`}
        onClick={() => setShowAgent('none')}
      >
        Manual Control
      </button>
      <button 
        className={`${styles.agentSelectorButton} ${showAgent === 'simple' ? styles.active : ''}`}
        onClick={() => setShowAgent('simple')}
      >
        Simple Agent
      </button>
      <button 
        className={`${styles.agentSelectorButton} ${showAgent === 'planning' ? styles.active : ''}`}
        onClick={() => setShowAgent('planning')}
      >
        Planning Agent
      </button>
    </div>
  )

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>
        Factory Distributing Station Simulation
      </h1>
      
      {renderAgentSelector()}
      
      <div className={styles.simulationContainer}>
        <div className={styles.simulationSection}>
          <Simulation simulationState={simulationState} />
        </div>
        
        <div className={styles.agentContainer}>
          <div className={styles.controlsContainer}>
            {showAgent === 'simple' ? (
              <SimpleAgentChat executeSkill={executeSkill} />
            ) : showAgent === 'planning' ? (
              <PlanningAgentChat executeSkill={executeSkill} />
            ) : (
              <ControlPanel 
                simulationState={simulationState} 
                executeSkill={executeSkill}
              />
            )}
            <SimulationLog logs={simulationState.logs} />
          </div>
        </div>
      </div>
    </main>
  )
} 