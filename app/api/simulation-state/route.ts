import { NextRequest, NextResponse } from 'next/server';
import { simulationState } from '../../shared/simulation-state';

export async function GET(request: NextRequest) {
  try {
    // Return the current simulation state
    return NextResponse.json({
      success: true,
      simulationState
    });
  } catch (error) {
    console.error('Error retrieving simulation state:', error);
    return NextResponse.json({
      success: false,
      error: `Error retrieving simulation state: ${error}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // This would normally update the state in a database
    const data = await request.json();
    const { state } = data;
    
    if (!state) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: state'
      }, { status: 400 });
    }
    
    console.log('[API Route] Updating simulation state:', state);
    
    // Update the simulation state
    Object.assign(simulationState, state);
    
    // Log the updated state
    console.log('[API Route] Updated simulation state:', simulationState);
    
    return NextResponse.json({
      success: true,
      simulationState
    });
  } catch (error) {
    console.error('Error updating simulation state:', error);
    return NextResponse.json({
      success: false,
      error: `Error updating simulation state: ${error}`
    }, { status: 500 });
  }
} 