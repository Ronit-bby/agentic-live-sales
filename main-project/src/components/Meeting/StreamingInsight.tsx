import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, CheckCircle } from 'lucide-react';
import { AgentType } from '../../types';

export interface StreamingInsight {
  id: string;
  agentType: string;
  content: string;
  isComplete: boolean;
  timestamp: Date;
  confidence?: number;
}

interface StreamingInsightProps {
  insight: StreamingInsight;
  agentType: AgentType;
  onComplete?: () => void;
}

export const StreamingInsightComponent: React.FC<StreamingInsightProps> = ({ 
  insight, 
  agentType, 
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (insight.isComplete && displayedText !== insight.content) {
      // Complete the text immediately if marked as complete
      setDisplayedText(insight.content);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    if (displayedText.length < insight.content.length) {
      const timer = setTimeout(() => {
        setDisplayedText(insight.content.slice(0, displayedText.length + 1));
      }, 20); // 50 WPM typing speed

      return () => clearTimeout(timer);
    } else if (displayedText.length === insight.content.length && insight.content.length > 0) {
      setIsTyping(false);
      if (insight.isComplete) {
        onComplete?.();
      }
    }
  }, [displayedText, insight.content, insight.isComplete, onComplete]);

  if (!insight.content && !isTyping) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 mb-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agentType.icon}</span>
          <div className="text-sm font-medium text-slate-200">
            {agentType.name}
          </div>
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400">Analyzing...</span>
              </motion.div>
            )}
            {!isTyping && insight.isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">Complete</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {insight.confidence && (
          <div className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
            {Math.round(insight.confidence * 100)}%
          </div>
        )}
      </div>
      
      <div className="relative">
        <p className="text-sm text-slate-300 leading-relaxed min-h-[1.25rem]">
          {displayedText}
          <AnimatePresence>
            {isTyping && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5"
              />
            )}
          </AnimatePresence>
        </p>
        
        {/* Progress indicator */}
        <div className="mt-2 h-0.5 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: '0%' }}
            animate={{ 
              width: insight.content.length > 0 
                ? `${(displayedText.length / insight.content.length) * 100}%` 
                : '0%' 
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export const StreamingInsightsContainer: React.FC<{
  insights: StreamingInsight[];
  agentTypes: AgentType[];
  onInsightComplete?: (insightId: string) => void;
}> = ({ insights, agentTypes, onInsightComplete }) => {
  const getAgentType = (agentId: string) => {
    return agentTypes.find(agent => agent.id === agentId);
  };

  if (insights.length === 0) return null;

  return (
    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70 space-y-3">
      <div className="flex items-center gap-2 mb-4 sticky top-0 bg-slate-900/90 backdrop-blur-sm p-2 rounded-lg">
        <Brain className="w-4 h-4 text-blue-400" />
        <h4 className="text-sm font-medium text-slate-200">Live Analysis</h4>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
      </div>
      
      <div className="px-2">
        <AnimatePresence mode="popLayout">
          {insights.map((insight) => {
            const agentType = getAgentType(insight.agentType);
            if (!agentType) return null;
            
            return (
              <StreamingInsightComponent
                key={insight.id}
                insight={insight}
                agentType={agentType}
                onComplete={() => onInsightComplete?.(insight.id)}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};