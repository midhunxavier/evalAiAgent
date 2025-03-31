'use client'

import { useEffect, useRef } from 'react'
import styles from './SimulationLog.module.css'

interface LogEntry {
  message: string;
  timestamp: string;
  isApi?: boolean;
}

interface SimulationLogProps {
  logs: string[];
}

export default function SimulationLog({ logs }: SimulationLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Process logs to add timestamps and identify API-related entries
  const processedLogs: LogEntry[] = logs.map((log, index) => {
    const isApi = log.includes('API') || 
                  log.includes('Executing skill:') || 
                  log.includes('Successfully executed');
    
    return {
      message: log,
      timestamp: new Date().toLocaleTimeString(),
      isApi
    };
  });

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className={styles.simulationLog}>
        <h2 className={styles.title}>Simulation Log</h2>
        <div className={styles.emptyState}>No activity logged yet.</div>
      </div>
    );
  }

  return (
    <div className={styles.simulationLog}>
      <h2 className={styles.title}>Simulation Log</h2>
      <div className={styles.logContainer} ref={logContainerRef}>
        {processedLogs.map((log, index) => (
          <div 
            key={index} 
            className={`${styles.logEntry} ${log.isApi ? styles.apiLogEntry : ''}`}
          >
            <span className={styles.logTime}>{log.timestamp}</span>
            <span className={styles.logMessage}>{log.message}</span>
          </div>
        ))}
      </div>
      <div className={styles.logStats}>
        <span>Total entries: {logs.length}</span>
        <span>API-related: {processedLogs.filter(log => log.isApi).length}</span>
      </div>
    </div>
  );
} 