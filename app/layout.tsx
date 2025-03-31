import type { Metadata } from 'next'
import './globals.css'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'

// Try to import amplify outputs - in production this will succeed
try {
  const outputs = require('../amplify_outputs.json')
  Amplify.configure(outputs)
  console.log('Amplify configured with outputs')
} catch (e) {
  // In development without sandbox, this might fail
  console.log('Failed to import amplify_outputs.json:', e)
  // Configure API key-based auth as fallback
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_API_URL || '/api/graphql',
        apiKey: process.env.NEXT_PUBLIC_API_KEY,
        defaultAuthMode: 'apiKey'
      }
    }
  })
}

export const metadata: Metadata = {
  title: 'Factory Distributing Station Simulation',
  description: 'AI agent controls the distributing station with rotating arm and stacked magazine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 