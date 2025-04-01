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
  const [selectedArm, setSelectedArm] = useState<'arm1' | 'arm2'>('arm1');

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

  // Handler functions for arm 1 skills
  const handleArm1MoveLeft = () => handleExecuteSkill('arm1_move_to_left_skill');
  const handleArm1MoveRight = () => handleExecuteSkill('arm1_move_to_right_skill');
  const handleArm1Pick = () => handleExecuteSkill('arm1_pick_workpiece_skill');
  const handleArm1Place = () => handleExecuteSkill('arm1_place_workpiece_skill');
  
  // Handler functions for arm 2 skills
  const handleArm2MoveLeft = () => handleExecuteSkill('arm2_move_to_left_skill');
  const handleArm2MoveRight = () => handleExecuteSkill('arm2_move_to_right_skill');
  const handleArm2Pick = () => handleExecuteSkill('arm2_pick_workpiece_skill');
  const handleArm2Place = () => handleExecuteSkill('arm2_place_workpiece_skill');
  
  // Handler functions for pusher skills
  const handlePusher1Push = () => handleExecuteSkill('pusher1_push_slow_workpiece_skill');
  const handlePusher2Push = () => handleExecuteSkill('pusher2_push_fast_workpiece_skill');
  
  // Handler for common skills
  const handleLoadMagazine = () => handleExecuteSkill('load_magazine_skill');

  return (
    <div className={styles.controlPanel}>
      <h2 className={styles.title}>Control Panel</h2>
      
      {lastResult && (
        <div className={`${styles.resultMessage} ${lastResult.includes('Error') ? styles.errorResult : styles.successResult}`}>
          {lastResult}
        </div>
      )}
      
      {/* Arm selector tabs */}
      <div className={styles.armSelector}>
        <button 
          className={`${styles.armSelectorButton} ${selectedArm === 'arm1' ? styles.active : ''}`}
          onClick={() => setSelectedArm('arm1')}
        >
          Arm 1 (Fast)
        </button>
        <button 
          className={`${styles.armSelectorButton} ${selectedArm === 'arm2' ? styles.active : ''}`}
          onClick={() => setSelectedArm('arm2')}
        >
          Arm 2 (Efficient)
        </button>
      </div>

      {/* Arm 1 Controls */}
      {selectedArm === 'arm1' && (
        <>
          <div className={styles.controlGroup}>
            <h3>Arm 1 Control</h3>
            <div className={styles.buttonRow}>
              <button 
                onClick={handleArm1MoveLeft}
                className={styles.controlButton}
              >
                {isExecuting === 'arm1_move_to_left_skill' ? 'Moving...' : 'Move Left'}
              </button>
              <button 
                onClick={handleArm1MoveRight}
                className={styles.controlButton}
              >
                {isExecuting === 'arm1_move_to_right_skill' ? 'Moving...' : 'Move Right'}
              </button>
            </div>
          </div>
          
          <div className={styles.controlGroup}>
            <h3>Arm 1 Workpiece Control</h3>
            <div className={styles.buttonRow}>
              <button 
                onClick={handleArm1Pick}
                className={styles.controlButton}
              >
                {isExecuting === 'arm1_pick_workpiece_skill' ? 'Picking...' : 'Pick Workpiece'}
              </button>
              <button 
                onClick={handleArm1Place}
                className={styles.controlButton}
              >
                {isExecuting === 'arm1_place_workpiece_skill' ? 'Placing...' : 'Place Workpiece'}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Arm 2 Controls */}
      {selectedArm === 'arm2' && (
        <>
          <div className={styles.controlGroup}>
            <h3>Arm 2 Control</h3>
            <div className={styles.buttonRow}>
              <button 
                onClick={handleArm2MoveLeft}
                className={styles.controlButton}
              >
                {isExecuting === 'arm2_move_to_left_skill' ? 'Moving...' : 'Move Left'}
              </button>
              <button 
                onClick={handleArm2MoveRight}
                className={styles.controlButton}
              >
                {isExecuting === 'arm2_move_to_right_skill' ? 'Moving...' : 'Move Right'}
              </button>
            </div>
          </div>
          
          <div className={styles.controlGroup}>
            <h3>Arm 2 Workpiece Control</h3>
            <div className={styles.buttonRow}>
              <button 
                onClick={handleArm2Pick}
                className={styles.controlButton}
              >
                {isExecuting === 'arm2_pick_workpiece_skill' ? 'Picking...' : 'Pick Workpiece'}
              </button>
              <button 
                onClick={handleArm2Place}
                className={styles.controlButton}
              >
                {isExecuting === 'arm2_place_workpiece_skill' ? 'Placing...' : 'Place Workpiece'}
              </button>
            </div>
          </div>
        </>
      )}
      
      <div className={styles.controlGroup}>
        <h3>Pusher Control</h3>
        <div className={styles.buttonRow}>
          <button 
            onClick={handlePusher1Push}
            className={styles.controlButton}
          >
            {isExecuting === 'pusher1_push_slow_workpiece_skill' ? 'Pushing...' : 'Slow Push'}
          </button>
          <button 
            onClick={handlePusher2Push}
            className={styles.controlButton}
          >
            {isExecuting === 'pusher2_push_fast_workpiece_skill' ? 'Pushing...' : 'Fast Push'}
          </button>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <h3>Magazine Control</h3>
        <div className={styles.buttonRow}>
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