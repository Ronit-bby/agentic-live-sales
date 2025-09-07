import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';
import { AgentType } from '../../types';
import { AGENT_TYPES } from '../../services/aiAgents';

interface LiveInsightsPanelProps {
  streamingInsights: Map<string, string>;
  processingAgents: Set<string>;
}

export const LiveInsightsPanel: React.FC<LiveInsightsPanelProps> = ({
  streamingInsights,
  processingAgents
}) => {
  const getAgentType = (agentId: string): AgentType | undefined => {
    return AGENT_TYPES.find(agent => agent.id === agentId);
  };

  if (streamingInsights.size === 0 && processingAgents.size === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/40 rounded-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 p-4 pb-3 border-b border-blue-500/30">
        <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
        <h3 className="text-base font-medium text-blue-300">Live AI Insights</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
            {streamingInsights.size} streaming
          </span>
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70 p-4 space-y-4">
        <AnimatePresence>
          {Array.from(streamingInsights.entries()).map(([agentId, streamingText]) => {
            const agentType = getAgentType(agentId);
            if (!agentType) return null;
            
            return (
              <StreamingInsightCard
                key={agentId}
                agentType={agentType}
                streamingText={streamingText}
                isProcessing={processingAgents.has(agentId)}
              />
            );
          })}
        </AnimatePresence>
        
        {/* Show processing agents without streaming text yet */}
        {Array.from(processingAgents).map(agentId => {
          if (streamingInsights.has(agentId)) return null;
          const agentType = getAgentType(agentId);
          if (!agentType) return null;
          
          return (
            <motion.div
              key={`processing-${agentId}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg animate-pulse">{agentType.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-300 mb-1">
                    {agentType.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    Initializing analysis...
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Streaming Insight Card Component
interface StreamingInsightCardProps {
  agentType: AgentType;
  streamingText: string;
  isProcessing: boolean;
}

const StreamingInsightCard: React.FC<StreamingInsightCardProps> = ({
  agentType,
  streamingText,
  isProcessing
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-slate-800/50 border border-blue-500/30 rounded-lg p-4 hover:bg-slate-800/70 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">{agentType.icon}</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-300">
            {agentType.name}
          </div>
          <div className="text-xs text-slate-400">
            Real-time analysis
          </div>
        </div>
        {isProcessing && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
      
      <div className="text-sm text-slate-300 leading-relaxed">
        <TypewriterText text={streamingText} isStreaming={isProcessing} />
        {isProcessing && (
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block ml-1 w-0.5 h-4 bg-blue-400 rounded"
          />
        )}
      </div>
    </motion.div>
  );
};

// Typewriter effect component for ChatGPT-like streaming
interface TypewriterTextProps {
  text: string;
  isStreaming: boolean;
  speed?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = 30 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (text.length === 0) {
      setDisplayText('');
      setCurrentIndex(0);
      return;
    }

    // If text is longer than what we're displaying, continue typing
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [text, currentIndex, speed]);

  // Reset when text changes dramatically (new streaming session)
  useEffect(() => {
    if (text.length < displayText.length * 0.8) {
      setDisplayText('');
      setCurrentIndex(0);
    }
  }, [text, displayText.length]);

  return (
    <span className="whitespace-pre-wrap">
      {displayText}
    </span>
  );
};