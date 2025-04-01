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
    rotatingArm2Position,
    isHoldingWorkpiece,
    isArm2HoldingWorkpiece,
    magazineWorkpieceCount, 
    workpiecePushed,
    pusher1Active,
    pusher2Active,
    status,
    logs 
  } = simulationState;

  const [animatingPusher1, setAnimatingPusher1] = useState(false);
  const [animatingPusher2, setAnimatingPusher2] = useState(false);
  const [animatingArm1, setAnimatingArm1] = useState(false);
  const [animatingArm2, setAnimatingArm2] = useState(false);
  const [placedWorkpieces, setPlacedWorkpieces] = useState<{id: string, opacity: number}[]>([]);
  
  // Get the most recent action from logs
  const lastActionMessage = logs && logs.length > 0 ? logs[0] : 'System ready';

  // Add animation effect for pushers
  useEffect(() => {
    if (pusher1Active) {
      setAnimatingPusher1(true);
      
      // Automatically reset animation after delay
      const timer = setTimeout(() => {
        setAnimatingPusher1(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [pusher1Active]);
  
  useEffect(() => {
    if (pusher2Active) {
      setAnimatingPusher2(true);
      
      // Automatically reset animation after delay (faster for pusher 2)
      const timer = setTimeout(() => {
        setAnimatingPusher2(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [pusher2Active]);

  // Add animation effect for arm movements
  useEffect(() => {
    setAnimatingArm1(true);
    const timer = setTimeout(() => {
      setAnimatingArm1(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [rotatingArmPosition]);
  
  useEffect(() => {
    setAnimatingArm2(true);
    const timer = setTimeout(() => {
      setAnimatingArm2(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [rotatingArm2Position]);

  // Handle workpiece placement on right conveyor
  useEffect(() => {
    // When a workpiece is placed by either arm
    const arm1Placed = rotatingArmPosition === 'right' && !isHoldingWorkpiece;
    const arm2Placed = rotatingArm2Position === 'right' && !isArm2HoldingWorkpiece;
    
    if ((arm1Placed || arm2Placed) && placedWorkpieces.every(wp => wp.opacity < 1)) {
      // Add a new workpiece to the conveyor
      const newId = Date.now().toString();
      setPlacedWorkpieces(prev => [...prev, { id: newId, opacity: 1 }]);
    }
  }, [rotatingArmPosition, rotatingArm2Position, isHoldingWorkpiece, isArm2HoldingWorkpiece, placedWorkpieces]);

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
  const arm1PositionClass = styles[`arm_${rotatingArmPosition}`];
  const arm2PositionClass = styles[`arm2_${rotatingArm2Position}`];

  return (
    <div className={styles.simulationContainer}>
      <div className={styles.statusDisplay}>
        <div className={styles.statusLabel}>Last Action:</div>
        <div className={styles.statusValue}>{lastActionMessage}</div>
      </div>
      
      <div className={styles.simulationArea}>
        {/* Left side - Stacked Magazine and Pushers */}
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
            <div className={styles.moduleLabel}>Pusher 1 (Slow)</div>
            <div className={`${styles.pusher} ${animatingPusher1 || pusher1Active ? styles.pusherExtended : ''}`}>
              <div className={styles.pusherBody} />
              <div className={styles.pusherRod} />
              <div className={styles.pusherHead} />
            </div>
          </div>
          
          <div className={styles.pusherContainer}>
            <div className={styles.moduleLabel}>Pusher 2 (Fast)</div>
            <div className={`${styles.pusher} ${styles.pusher2} ${animatingPusher2 || pusher2Active ? styles.pusherExtended : ''}`}>
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
        
        {/* Rotating Arms */}
        <div className={styles.armSection}>
          <div className={`${styles.rotatingArm} ${arm1PositionClass} ${animatingArm1 ? styles.armAnimating : ''}`}>
            <div className={styles.moduleLabel}>Rotating Arm 1</div>
            <div className={styles.armBase} />
            <div className={styles.arm}>
              {isHoldingWorkpiece && (
                <div className={styles.workpieceOnArm}>
                  <div className={styles.workpiece} />
                </div>
              )}
            </div>
          </div>
          
          <div className={`${styles.rotatingArm} ${styles.rotatingArm2} ${arm2PositionClass} ${animatingArm2 ? styles.armAnimating : ''}`}>
            <div className={styles.moduleLabel}>Rotating Arm 2</div>
            <div className={styles.armBase} />
            <div className={styles.arm}>
              {isArm2HoldingWorkpiece && (
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
          Arm 1: {rotatingArmPosition} {isHoldingWorkpiece ? '(holding)' : '(empty)'}
        </div>
        <div className={`${styles.indicator} ${styles.active}`}>
          Arm 2: {rotatingArm2Position} {isArm2HoldingWorkpiece ? '(holding)' : '(empty)'}
        </div>
      </div>
    </div>
  )
} 