'use client'

import { useState } from 'react'
import styles from './ControlPanel.module.css'
import { SimulationStateType } from '../page'

interface ControlPanelProps {
  simulationState: SimulationStateType;
  executeSkill: (skillName: string) => Promise<string>;
}

export default function ControlPanel({ 
  simulationState, 
  executeSkill 
}: ControlPanelProps) {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Handler for executing skills with UI feedback
  const handleExecuteSkill = async (skillName: string) => {
    try {
      setIsExecuting(skillName);
      setLastResult(null);
      
      // Use the executeSkill function passed from the parent component
      const result = await executeSkill(skillName);
      
      // Set the result message
      setLastResult(result);
    } catch (error) {
      console.error(`Error executing ${skillName}:`, error);
      setLastResult(`Error: ${error}`);
    } finally {
      setIsExecuting(null);
    }
  };

  // Handler functions for each skill
  const handleMoveLeft = () => handleExecuteSkill('move_to_left_skill');
  const handleMoveRight = () => handleExecuteSkill('move_to_right_skill');
  const handlePick = () => handleExecuteSkill('pick_workpiece_skill');
  const handlePlace = () => handleExecuteSkill('place_workpiece_skill');
  const handlePush = () => handleExecuteSkill('push_workpiece_skill');
  const handleLoadMagazine = () => handleExecuteSkill('load_magazine_skill');

  return (
    <div className={styles.controlPanel}>
      <h2 className={styles.title}>Control Panel</h2>
      
      {lastResult && (
        <div className={`${styles.resultMessage} ${lastResult.includes('Error') ? styles.errorResult : styles.successResult}`}>
          {lastResult}
        </div>
      )}
      
      <div className={styles.controlGroup}>
        <h3>Rotating Arm Control</h3>
        <div className={styles.buttonRow}>
          <button 
            onClick={handleMoveLeft}
            className={styles.controlButton}
          >
            {isExecuting === 'move_to_left_skill' ? 'Moving...' : 'Move Left'}
          </button>
          <button 
            onClick={handleMoveRight}
            className={styles.controlButton}
          >
            {isExecuting === 'move_to_right_skill' ? 'Moving...' : 'Move Right'}
          </button>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <h3>Workpiece Control</h3>
        <div className={styles.buttonRow}>
          <button 
            onClick={handlePick}
            className={styles.controlButton}
          >
            {isExecuting === 'pick_workpiece_skill' ? 'Picking...' : 'Pick Workpiece'}
          </button>
          <button 
            onClick={handlePlace}
            className={styles.controlButton}
          >
            {isExecuting === 'place_workpiece_skill' ? 'Placing...' : 'Place Workpiece'}
          </button>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <h3>Magazine Control</h3>
        <div className={styles.buttonRow}>
          <button 
            onClick={handlePush}
            className={styles.controlButton}
          >
            {isExecuting === 'push_workpiece_skill' ? 'Pushing...' : 'Push Workpiece'}
          </button>
          <button 
            onClick={handleLoadMagazine}
            className={styles.controlButton}
          >
            {isExecuting === 'load_magazine_skill' ? 'Loading...' : 'Load Magazine'}
          </button>
        </div>
      </div>
    </div>
  );
} 