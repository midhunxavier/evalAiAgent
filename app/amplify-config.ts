'use client';

import { Amplify } from 'aws-amplify';

// Initialize Amplify once
export function configureAmplify() {
  Amplify.configure({
    // Basic configuration for API
    API: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_API_URL || '/api/graphql',
        defaultAuthMode: 'apiKey',
        apiKey: process.env.NEXT_PUBLIC_API_KEY || 'local-api-key'
      }
    }
  });
}

// Flag to avoid double configuration
let isConfigured = false;

// Function to ensure Amplify is only configured once
export function ensureAmplifyConfigured() {
  if (!isConfigured) {
    configureAmplify();
    isConfigured = true;
    console.log('✅ Amplify configured successfully');
  }
} 