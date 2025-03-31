# Factory Distributing Station Simulation

This project is a frontend simulation of a factory Distributing Station built with Next.js and TypeScript. It simulates two main components: a ROTATING ARM and a STACKED MAGAZINE.

## Components

- **ROTATING ARM**: Positioned centrally in the simulation. Can move left/right, pick, and place workpieces.
- **STACKED MAGAZINE**: Positioned to the left side of the ROTATING ARM. Holds 6 workpieces initially and pushes them forward to be picked.

## Simulation Features

### Manual Controls
The simulation includes the following predefined skills (actions) available through manual controls:

| Skill Name | Component | Description |
|------------|-----------|-------------|
| Move_to_left_skill | Rotating Arm | Moves the rotating arm to the left (toward magazine) |
| Move_to_right_skill | Rotating Arm | Moves the rotating arm to the right |
| Pick_workpiece_skill | Rotating Arm | Picks the workpiece (must be pushed first) |
| Place_workpiece_skill | Rotating Arm | Drops the workpiece |
| Push_Workpiece_Skill | Stacked Magazine | Pushes the next workpiece out of the magazine |
| Load_Magazine_Skill | Stacked Magazine | Loads 6 new workpieces into the magazine |

### AI Chat Assistant
The simulation now includes an AI Assistant that allows you to interact with the machine using natural language. The assistant uses a plan-and-execute approach to break down complex tasks into individual steps.

You can ask the assistant to perform tasks like:
- "Load the magazine"
- "Pick a workpiece"
- "Place the workpiece"
- "Push a workpiece"
- "Run a complete cycle"

The assistant will create a plan with steps and execute them one by one, providing feedback at each step.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Toggle between Manual Controls and AI Assistant using the button at the top of the interface.
2. In Manual Controls mode, use the buttons to execute individual skills.
3. In AI Assistant mode, type natural language instructions in the chat interface and the assistant will execute them.
4. When the assistant creates a plan, you can click "Continue Plan" to execute each step one by one.

## Features

- Visual representation of the Rotating Arm and Stacked Magazine
- Button controls for each skill operation
- Real-time state updates (arm position, workpiece count, etc.)
- Simulation log to track executed skills
- Visual feedback for each action

## Implementation Notes

- Each button or assistant action triggers a simulated REST API call to perform the action
- The frontend maintains and updates the state of the simulation based on executed skills
- The simulation enforces logical constraints (e.g., can't pick if no workpiece is pushed, can't place if not holding)
- The AI Assistant implements a plan-and-execute architecture that:
  1. Creates a multi-step plan based on your request
  2. Executes each step sequentially
  3. Provides feedback and updates the plan as needed 