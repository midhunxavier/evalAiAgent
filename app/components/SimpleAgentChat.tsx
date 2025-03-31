'use client'

import React, { useState } from 'react'
import styles from './SimpleAgentChat.module.css'

interface Message {
  content: string;
  type: 'user' | 'agent' | 'action' | 'result';
  id: string;
  feedback?: 'thumbsUp' | 'thumbsDown' | null;
}

interface SimpleAgentChatProps {
  executeSkill: (skill: string) => Promise<string>;
}

interface FeedbackStats {
  thumbsUp: number;
  thumbsDown: number;
}

const SimpleAgentChat: React.FC<SimpleAgentChatProps> = ({
  executeSkill
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      content: 'I\'m your factory assistant. Tell me what to do, and I\'ll help you execute the right skill.',
      type: 'agent',
      id: '1'
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    thumbsUp: 0,
    thumbsDown: 0
  });

  const generateId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  const addMessage = (content: string, type: Message['type']) => {
    const newMessage = {
      content,
      type,
      id: generateId(),
      feedback: null
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const handleFeedback = (messageId: string, feedback: 'thumbsUp' | 'thumbsDown') => {
    setMessages(prev => prev.map(message => {
      if (message.id === messageId) {
        // If the same feedback is clicked again, toggle it off
        const newFeedback = message.feedback === feedback ? null : feedback;
        
        // Update feedback stats
        if (message.feedback === 'thumbsUp' && newFeedback !== 'thumbsUp') {
          setFeedbackStats(prev => ({ ...prev, thumbsUp: prev.thumbsUp - 1 }));
        } else if (message.feedback === 'thumbsDown' && newFeedback !== 'thumbsDown') {
          setFeedbackStats(prev => ({ ...prev, thumbsDown: prev.thumbsDown - 1 }));
        }
        
        if (newFeedback === 'thumbsUp' && message.feedback !== 'thumbsUp') {
          setFeedbackStats(prev => ({ ...prev, thumbsUp: prev.thumbsUp + 1 }));
        } else if (newFeedback === 'thumbsDown' && message.feedback !== 'thumbsDown') {
          setFeedbackStats(prev => ({ ...prev, thumbsDown: prev.thumbsDown + 1 }));
        }
        
        return { ...message, feedback: newFeedback };
      }
      return message;
    }));
    
    // Here you would typically send the feedback to your backend
    console.log(`Feedback for message ${messageId}: ${feedback}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Add user message
    addMessage(input, 'user');
    setInput('');
    setIsProcessing(true);
    
    try {
      // Add thinking message
      const thinkingId = addMessage('Thinking... Identifying the best skill to execute.', 'agent');
      
      // Call the simple agent API
      const response = await fetch('/api/simple-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: input 
        }),
      });
      
      // Get the response body
      const result = await response.json();
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
      
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }
      
      if (result.success) {
        // Show the explanation
        const explanationId = addMessage(`I'll execute: ${result.explanation}`, 'agent');
        
        // Show the action being taken
        addMessage(`🔄 EXECUTING SKILL: ${result.skill}`, 'action');
        
        try {
          // Execute the skill directly (this should update the simulation)
          const skillResult = await executeSkill(result.skill);
          
          // Show the result
          addMessage(`✅ RESULT: ${skillResult || result.result || 'Skill executed successfully'}`, 'result');
        } catch (skillError) {
          addMessage(`❌ ERROR: Failed to execute skill: ${skillError}`, 'result');
        }
      } else {
        throw new Error(result.error || 'Failed to process request');
      }
    } catch (error: any) {
      addMessage(`❌ ERROR: ${error.message || 'Unknown error occurred'}`, 'agent');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.headerIcon}>🤖</span>
          <span>Simple Agent Assistant</span>
        </div>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>👍</span>
            <span>{feedbackStats.thumbsUp}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>👎</span>
            <span>{feedbackStats.thumbsDown}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.messagesContainer}>
        {messages.map(message => (
          <div key={message.id} className={styles.messageWithFeedback}>
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.content}
            </div>
            
            {/* Only show feedback options for agent messages */}
            {message.type === 'agent' && (
              <div className={styles.feedbackContainer}>
                <span className={styles.feedbackText}>Was this helpful?</span>
                <button 
                  className={`${styles.feedbackButton} ${styles.thumbsUp} ${message.feedback === 'thumbsUp' ? styles.selected : ''}`}
                  onClick={() => handleFeedback(message.id, 'thumbsUp')}
                  aria-label="Thumbs up"
                >
                  👍
                </button>
                <button 
                  className={`${styles.feedbackButton} ${styles.thumbsDown} ${message.feedback === 'thumbsDown' ? styles.selected : ''}`}
                  onClick={() => handleFeedback(message.id, 'thumbsDown')}
                  aria-label="Thumbs down"
                >
                  👎
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your request..."
          disabled={isProcessing}
          className={styles.inputField}
        />
        <button 
          type="submit" 
          disabled={isProcessing || !input.trim()}
          className={styles.sendButton}
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default SimpleAgentChat; 