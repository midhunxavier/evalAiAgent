'use client'

import { useState } from 'react'
import styles from './SkillCostTable.module.css'

// Define skill cost data structure
interface SkillCost {
  name: string;
  displayName: string;
  energy: number;
  time: number;
  wear: number;
  description: string;
}

// Group skills by component
interface SkillGroups {
  arm1: SkillCost[];
  arm2: SkillCost[];
  pushers: SkillCost[];
  magazine: SkillCost[];
}

export default function SkillCostTable() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof SkillGroups | 'all'>('all');

  // Skill data
  const skillGroups: SkillGroups = {
    arm1: [
      {
        name: 'arm1_move_to_left_skill',
        displayName: 'Move to Left',
        energy: 2,
        time: 1.5,
        wear: 1,
        description: 'Rotating arm 1 moves to the left side of the magazine'
      },
      {
        name: 'arm1_move_to_right_skill',
        displayName: 'Move to Right',
        energy: 2,
        time: 1.5,
        wear: 1,
        description: 'Rotating arm 1 moves to the right side of it'
      },
      {
        name: 'arm1_pick_workpiece_skill',
        displayName: 'Pick Workpiece',
        energy: 3,
        time: 1.5,
        wear: 1.5,
        description: 'Rotating arm 1 picks the workpiece from the left side of the magazine'
      },
      {
        name: 'arm1_place_workpiece_skill',
        displayName: 'Place Workpiece',
        energy: 3,
        time: 1.5,
        wear: 1.5,
        description: 'Rotating arm 1 places the workpiece on the right side of it'
      }
    ],
    arm2: [
      {
        name: 'arm2_move_to_left_skill',
        displayName: 'Move to Left',
        energy: 1,
        time: 2,
        wear: 0.5,
        description: 'Rotating arm 2 moves to the left side of the magazine'
      },
      {
        name: 'arm2_move_to_right_skill',
        displayName: 'Move to Right',
        energy: 1,
        time: 2,
        wear: 0.5,
        description: 'Rotating arm 2 moves to the right side of the magazine'
      },
      {
        name: 'arm2_pick_workpiece_skill',
        displayName: 'Pick Workpiece',
        energy: 2,
        time: 2.5,
        wear: 1,
        description: 'Rotating arm 2 picks the workpiece from the left side of the magazine'
      },
      {
        name: 'arm2_place_workpiece_skill',
        displayName: 'Place Workpiece',
        energy: 2,
        time: 2.5,
        wear: 1,
        description: 'Rotating arm 2 places the workpiece on the right side of it'
      }
    ],
    pushers: [
      {
        name: 'pusher1_push_slow_workpiece_skill',
        displayName: 'Pusher 1 (Slow)',
        energy: 1,
        time: 3,
        wear: 0.5,
        description: 'Pusher 1 pushes the workpiece from the magazine end to the rotating arms end (automatically retracts after pushing)'
      },
      {
        name: 'pusher2_push_fast_workpiece_skill',
        displayName: 'Pusher 2 (Fast)',
        energy: 2,
        time: 2,
        wear: 1,
        description: 'Pusher 2 pushes the workpiece from the magazine end to the rotating arms end (automatically retracts after pushing)'
      }
    ],
    magazine: [
      {
        name: 'load_magazine_skill',
        displayName: 'Load Magazine',
        energy: 2,
        time: 2,
        wear: 0.5,
        description: 'Load the workpiece into the magazine'
      }
    ]
  };

  // Toggle visibility
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Handle category change
  const handleCategoryChange = (category: keyof SkillGroups | 'all') => {
    setActiveCategory(category);
  };

  // Get skills to display based on active category
  const getDisplaySkills = () => {
    if (activeCategory === 'all') {
      return [
        ...skillGroups.arm1,
        ...skillGroups.arm2,
        ...skillGroups.pushers,
        ...skillGroups.magazine
      ];
    }
    return skillGroups[activeCategory];
  };

  return (
    <div className={styles.skillCostContainer}>
      <button 
        className={styles.toggleButton}
        onClick={toggleVisibility}
      >
        {isVisible ? 'Hide Skill Cost Table' : 'Show Skill Cost Table'}
      </button>
      
      {isVisible && (
        <div className={styles.tableContainer}>
          <h2 className={styles.title}>Skill Cost Table</h2>
          
          <div className={styles.categorySelector}>
            <button 
              className={`${styles.categoryButton} ${activeCategory === 'all' ? styles.active : ''}`}
              onClick={() => handleCategoryChange('all')}
            >
              All
            </button>
            <button 
              className={`${styles.categoryButton} ${activeCategory === 'arm1' ? styles.active : ''}`}
              onClick={() => handleCategoryChange('arm1')}
            >
              Arm 1
            </button>
            <button 
              className={`${styles.categoryButton} ${activeCategory === 'arm2' ? styles.active : ''}`}
              onClick={() => handleCategoryChange('arm2')}
            >
              Arm 2
            </button>
            <button 
              className={`${styles.categoryButton} ${activeCategory === 'pushers' ? styles.active : ''}`}
              onClick={() => handleCategoryChange('pushers')}
            >
              Pushers
            </button>
            <button 
              className={`${styles.categoryButton} ${activeCategory === 'magazine' ? styles.active : ''}`}
              onClick={() => handleCategoryChange('magazine')}
            >
              Magazine
            </button>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.costTable}>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Energy</th>
                  <th>Time</th>
                  <th>Wear</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {getDisplaySkills().map((skill) => (
                  <tr key={skill.name}>
                    <td className={styles.skillName}>{skill.displayName}</td>
                    <td className={styles.costValue}>{skill.energy}</td>
                    <td className={styles.costValue}>{skill.time}</td>
                    <td className={styles.costValue}>{skill.wear}</td>
                    <td className={styles.description}>{skill.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 