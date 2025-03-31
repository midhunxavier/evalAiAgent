'use client'

import { useEffect, useState } from 'react';
import styles from './Simulation.module.css'
import { SimulationStateType } from '../page'

interface SimulationProps {
  simulationState: SimulationStateType;
}

export default function Simulation({ simulationState }: SimulationProps) {
  const { 
    rotatingArmPosition, 
    isHoldingWorkpiece, 
    magazineWorkpieceCount, 
    workpiecePushed, 
    status,
    logs 
  } = simulationState;

  const [animatingPusher, setAnimatingPusher] = useState(false);
  const [animatingArm, setAnimatingArm] = useState(false);
  const [placedWorkpieces, setPlacedWorkpieces] = useState<{id: string, opacity: number}[]>([]);
  
  // Get the most recent action from logs
  const lastActionMessage = logs && logs.length > 0 ? logs[0] : 'System ready';

  // Add animation effect for pusher
  useEffect(() => {
    if (workpiecePushed) {
      setAnimatingPusher(true);
      const timer = setTimeout(() => {
        setAnimatingPusher(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [workpiecePushed]);

  // Add animation effect for arm movement
  useEffect(() => {
    setAnimatingArm(true);
    const timer = setTimeout(() => {
      setAnimatingArm(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [rotatingArmPosition]);

  // Handle workpiece placement on right conveyor
  useEffect(() => {
    // When a workpiece is placed (arm is in right position and no longer holding workpiece)
    if (rotatingArmPosition === 'right' && !isHoldingWorkpiece && placedWorkpieces.every(wp => wp.opacity < 1)) {
      // Add a new workpiece to the conveyor
      const newId = Date.now().toString();
      setPlacedWorkpieces(prev => [...prev, { id: newId, opacity: 1 }]);
    }
  }, [rotatingArmPosition, isHoldingWorkpiece, placedWorkpieces]);

  // Fade out and remove placed workpieces
  useEffect(() => {
    if (placedWorkpieces.length > 0) {
      const timer = setInterval(() => {
        setPlacedWorkpieces(prev => 
          prev.map(wp => ({
            ...wp,
            opacity: Math.max(0, wp.opacity - 0.05)
          })).filter(wp => wp.opacity > 0)
        );
      }, 300);
      
      return () => clearInterval(timer);
    }
  }, [placedWorkpieces]);

  // Calculate styles for components based on state
  const armPositionClass = styles[`arm_${rotatingArmPosition}`];

  return (
    <div className={styles.simulationContainer}>
      <div className={styles.statusDisplay}>
        <div className={styles.statusLabel}>Last Action:</div>
        <div className={styles.statusValue}>{lastActionMessage}</div>
      </div>
      
      <div className={styles.simulationArea}>
        {/* Left side - Stacked Magazine and Pusher */}
        <div className={styles.leftSection}>
          <div className={styles.magazine}>
            <div className={styles.moduleLabel}>Stacked Magazine</div>
            <div className={styles.magazineStack}>
              {[...Array(magazineWorkpieceCount)].map((_, i) => (
                <div 
                  key={i} 
                  className={styles.workpiece}
                  style={{ bottom: `${i * 15}px` }}
                />
              ))}
            </div>
          </div>
          
          <div className={styles.pusherContainer}>
            <div className={styles.moduleLabel}>Pusher Cylinder</div>
            <div className={`${styles.pusher} ${animatingPusher ? styles.pusherExtended : ''}`}>
              <div className={styles.pusherBody} />
              <div className={styles.pusherRod} />
              <div className={styles.pusherHead} />
            </div>
          </div>
        </div>
        
        {/* Center - Conveyor and Pushed Workpiece */}
        <div className={styles.centerSection}>
          <div className={styles.leftConveyor}>
            <div className={styles.conveyorBelt}>
              <div className={styles.moduleLabel}>Left Conveyor</div>
              <div className={styles.conveyorLines}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={styles.conveyorLine} />
                ))}
              </div>
            </div>
            
            {/* Workpiece that has been pushed out */}
            {workpiecePushed && (
              <div className={styles.pushedWorkpiece}>
                <div className={styles.workpiece} />
              </div>
            )}
          </div>
        </div>
        
        {/* Rotating Arm */}
        <div className={styles.armSection}>
          <div className={`${styles.rotatingArm} ${armPositionClass} ${animatingArm ? styles.armAnimating : ''}`}>
            <div className={styles.moduleLabel}>Rotating Arm</div>
            <div className={styles.armBase} />
            <div className={styles.arm}>
              {isHoldingWorkpiece && (
                <div className={styles.workpieceOnArm}>
                  <div className={styles.workpiece} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side - Right Conveyor only (Output Area removed) */}
        <div className={styles.rightSection}>
          <div className={styles.rightConveyor}>
            <div className={styles.conveyorBelt}>
              <div className={styles.moduleLabel}>Right Conveyor</div>
              <div className={styles.conveyorLines}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={styles.conveyorLine} />
                ))}
              </div>
              
              {/* Placed workpieces that slowly disappear */}
              {placedWorkpieces.map(workpiece => (
                <div 
                  key={workpiece.id}
                  className={styles.placedWorkpiece}
                  style={{ opacity: workpiece.opacity }}
                >
                  <div className={styles.workpiece} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Indicators */}
      <div className={styles.statusIndicators}>
        <div className={`${styles.indicator} ${magazineWorkpieceCount > 0 ? styles.active : ''}`}>
          Magazine: {magazineWorkpieceCount > 0 ? `${magazineWorkpieceCount} pieces` : 'Empty'}
        </div>
        <div className={`${styles.indicator} ${workpiecePushed ? styles.active : ''}`}>
          Pusher: {workpiecePushed ? 'Workpiece Pushed' : 'Ready'}
        </div>
        <div className={`${styles.indicator} ${styles.active}`}>
          Arm Position: {rotatingArmPosition}
        </div>
        <div className={`${styles.indicator} ${isHoldingWorkpiece ? styles.active : ''}`}>
          Arm: {isHoldingWorkpiece ? 'Holding Workpiece' : 'Empty'}
        </div>
      </div>
    </div>
  )
} 