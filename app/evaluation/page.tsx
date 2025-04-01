'use client'

import React, { useState, useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { Schema } from '../../amplify/data/resource'
import { AVAILABLE_MODELS, type ModelName } from '../agent/planning-agent'
import styles from './evaluation.module.css'

// Basic evaluation interface
interface AgentEvaluation {
  id: string
  modelName: string
  userQuery: string
  actions: string[]
  isCorrect: boolean
  explanation?: string | null
  timestamp: string
  systemState?: string
}

// Metric interface
interface ModelEvalMetrics {
  modelName: string
  totalEvaluations: number
  correctResponses: number
  incorrectResponses: number
  successRate: number
}

export default function EvaluationDashboard() {
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([])
  const [metrics, setMetrics] = useState<ModelEvalMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<string>('Unknown')
  const [amplifyConfigured, setAmplifyConfigured] = useState(false)

  // Initialize Amplify
  useEffect(() => {
    // Configure Amplify
    try {
      try {
        // Try to load the outputs file (this works when deployed)
        const outputs = require('../../../amplify_outputs.json')
        Amplify.configure(outputs)
        console.log('Amplify configured with sandbox outputs')
      } catch (e) {
        // Local development fallback
        console.log('Failed to load amplify_outputs.json, using fallback config')
        Amplify.configure({
          API: {
            GraphQL: {
              endpoint: process.env.NEXT_PUBLIC_API_URL || '/api/graphql',
              apiKey: process.env.NEXT_PUBLIC_API_KEY || 'dummy-api-key',
              defaultAuthMode: 'apiKey'
            }
          }
        })
      }
      setAmplifyConfigured(true)
    } catch (error) {
      console.error('Error configuring Amplify:', error)
      setError('Failed to configure Amplify client')
    }
  }, [])

  // Fetch evaluations from API once Amplify is configured
  useEffect(() => {
    if (!amplifyConfigured) return

    const fetchEvaluations = async () => {
      setIsLoading(true)
      let source = 'Unknown'

      try {
        console.log('Creating Amplify client')
        const client = generateClient<Schema>()
        
        // Try to fetch directly from DynamoDB
        try {
          console.log('Fetching data from DynamoDB...')
          const dynamoDbData = await client.models.AgentEvaluation.list()
          
          if (dynamoDbData.data && dynamoDbData.data.length > 0) {
            console.log('Successfully fetched data from DynamoDB', dynamoDbData.data.length, 'records')
            processEvaluationData(dynamoDbData.data)
            source = 'DynamoDB'
            setDataSource(source)
            setError(null)
            setIsLoading(false)
            return
          } else {
            console.log('No data found in DynamoDB, trying API fallback')
          }
        } catch (dynamoErr) {
          console.error('Error fetching from DynamoDB:', dynamoErr)
          
          // Try to fetch some sample data from in-memory API
          try {
            console.log('Falling back to API route for in-memory data')
            const response = await fetch('/api/planning-agent?evaluations=true')
            
            if (!response.ok) {
              throw new Error(`API responded with status ${response.status}`)
            }
            
            const data = await response.json()
            
            if (data.success && Array.isArray(data.data)) {
              source = data.source === 'in-memory' ? 'In-Memory Store' : data.source || 'API'
              setDataSource(source)
              console.log(`Evaluations data from ${source}:`, data.data.length, 'records')
              processEvaluationData(data.data)
              setError(null)
            } else {
              console.log('No evaluations or invalid data format', data)
              setEvaluations([])
              setMetrics([])
            }
          } catch (apiError) {
            console.error('Error fetching from API fallback:', apiError)
            setError(`Failed to fetch data: ${apiError instanceof Error ? apiError.message : String(apiError)}`)
          }
        }
      } catch (err) {
        console.error('Error in fetching evaluations:', err)
        setError(`Failed to load evaluations data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvaluations()
  }, [amplifyConfigured])
  
  // Process the evaluation data
  const processEvaluationData = (rawData: any[]) => {
    console.log('Processing evaluation data:', rawData)
    // Map and clean the data
    const cleanedData: AgentEvaluation[] = rawData.map((item: any) => ({
      id: item.id || `eval-${Math.random()}`,
      modelName: item.modelName || 'unknown',
      userQuery: item.userQuery || '',
      actions: Array.isArray(item.actions) ? 
        item.actions.filter((a: any) => a !== null) : [],
      isCorrect: Boolean(item.isCorrect),
      explanation: item.explanation || null,
      timestamp: item.timestamp || new Date().toISOString(),
      systemState: item.systemState || null
    }))
    
    // Sort by timestamp
    const sortedData = cleanedData.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    console.log('Sorted evaluation data:', sortedData)
    setEvaluations(sortedData)
    calculateMetrics(sortedData)
  }

  // Calculate metrics for model comparison
  const calculateMetrics = (evaluationData: AgentEvaluation[]) => {
    const modelMetrics: Record<string, ModelEvalMetrics> = {}

    // Initialize metrics for all models
    Object.keys(AVAILABLE_MODELS).forEach(model => {
      modelMetrics[model] = {
        modelName: model,
        totalEvaluations: 0,
        correctResponses: 0,
        incorrectResponses: 0,
        successRate: 0
      }
    })

    // Count evaluations for each model
    evaluationData.forEach(item => {
      if (!modelMetrics[item.modelName]) {
        modelMetrics[item.modelName] = {
          modelName: item.modelName,
          totalEvaluations: 0,
          correctResponses: 0,
          incorrectResponses: 0,
          successRate: 0
        }
      }

      modelMetrics[item.modelName].totalEvaluations++
      if (item.isCorrect) {
        modelMetrics[item.modelName].correctResponses++
      } else {
        modelMetrics[item.modelName].incorrectResponses++
      }
    })

    // Calculate success rates
    Object.values(modelMetrics).forEach(metric => {
      if (metric.totalEvaluations > 0) {
        metric.successRate = (metric.correctResponses / metric.totalEvaluations) * 100
      }
    })

    setMetrics(Object.values(modelMetrics))
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch (e) {
      return 'Invalid date'
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading evaluation data...</div>
  }

  if (error) {
    return <div className={styles.error}>{error}</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Agent Evaluation Dashboard</h1>
      
      <div className={styles.navigation}>
        <a href="/" className={styles.backLink}>← Back to Simulation</a>
      </div>

      <div className={styles.description}>
        <p>
          This dashboard tracks the performance of different AI models in controlling the factory distributing station.
          Each model's success rate is measured based on user feedback about the correctness of the plans generated.
        </p>
        <p>
          Use this data to compare model performance and identify which models perform best for different types of tasks.
        </p>
      </div>

      {/* Model Comparison Matrix */}
      <section className={styles.section}>
        <h2>Model Performance Comparison</h2>
        <div className={styles.metricsContainer}>
          {metrics.map(metric => (
            <div key={metric.modelName} className={styles.metricCard}>
              <h3>{AVAILABLE_MODELS[metric.modelName as ModelName] || metric.modelName}</h3>
              <div className={styles.metricDetails}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Total Evaluations:</span>
                  <span className={styles.metricValue}>{metric.totalEvaluations}</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Success Rate:</span>
                  <span className={styles.metricValue}>
                    {metric.totalEvaluations > 0 ? `${metric.successRate.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Correct:</span>
                  <span className={styles.metricValue}>{metric.correctResponses}</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Incorrect:</span>
                  <span className={styles.metricValue}>{metric.incorrectResponses}</span>
                </div>
              </div>
              {metric.totalEvaluations > 0 && (
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${metric.successRate}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Evaluation Records Table */}
      <section className={styles.section}>
        <h2>Evaluation Records</h2>
        <div className={styles.recordsHeader}>
          <span>Total Records: {evaluations.length}</span>
          <div className={styles.recordsSource}>
            Source: <span className={styles.sourceType}>{dataSource}</span>
          </div>
        </div>
        
        {evaluations.length === 0 ? (
          <div className={styles.noData}>No evaluation data available yet</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.evaluationsTable}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Model</th>
                  <th>Query</th>
                  <th>Result</th>
                  <th>Actions</th>
                  <th>Initial System State</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map(evaluation => (
                  <tr key={evaluation.id} className={evaluation.isCorrect ? styles.successRow : styles.errorRow}>
                    <td>{formatTimestamp(evaluation.timestamp)}</td>
                    <td>{AVAILABLE_MODELS[evaluation.modelName as ModelName] || evaluation.modelName}</td>
                    <td className={styles.queryCell}>{evaluation.userQuery}</td>
                    <td>{evaluation.isCorrect ? '✓ Correct' : '✗ Incorrect'}</td>
                    <td className={styles.actionsCell}>
                      <details>
                        <summary>Show Actions</summary>
                        <ol className={styles.actionsList}>
                          {evaluation.actions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ol>
                        {evaluation.explanation && (
                          <div className={styles.explanation}>
                            <strong>Explanation:</strong> {evaluation.explanation}
                          </div>
                        )}
                      </details>
                    </td>
                    <td className={styles.stateCell}>
                      {evaluation.systemState ? (
                        <details>
                          <summary>Show Initial State</summary>
                          <div className={styles.stateDetails}>
                            <pre>{evaluation.systemState}</pre>
                          </div>
                        </details>
                      ) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
} 