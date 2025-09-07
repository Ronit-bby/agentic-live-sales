import { useState } from 'react';

export interface StreamingInsight {
  id: string;
  agentType: string;
  content: string;
  isComplete: boolean;
  timestamp: Date;
  confidence?: number;
}

export const useStreamingInsights = () => {
  const [insights, setInsights] = useState<StreamingInsight[]>([]);

  const addStreamingInsight = (agentId: string): string => {
    const id = `${agentId}-${Date.now()}`;
    const newInsight: StreamingInsight = {
      id,
      agentType: agentId,
      content: '',
      isComplete: false,
      timestamp: new Date()
    };
    setInsights(prev => [...prev, newInsight]);
    return id;
  };

  const updateStreamingInsight = (id: string, content: string, confidence?: number) => {
    setInsights(prev => 
      prev.map(insight => 
        insight.id === id 
          ? { ...insight, content, confidence }
          : insight
      )
    );
  };

  const completeStreamingInsight = (id: string) => {
    setInsights(prev => 
      prev.map(insight => 
        insight.id === id 
          ? { ...insight, isComplete: true }
          : insight
      )
    );
    
    // Auto-remove completed insights after 15 seconds
    setTimeout(() => {
      setInsights(prev => prev.filter(insight => insight.id !== id));
    }, 15000);
  };

  const clearAllInsights = () => {
    setInsights([]);
  };

  return {
    insights,
    addStreamingInsight,
    updateStreamingInsight,
    completeStreamingInsight,
    clearAllInsights
  };
};