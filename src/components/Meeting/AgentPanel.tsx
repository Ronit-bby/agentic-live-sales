import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Info, Clock, Brain } from 'lucide-react';
import { AgentOutput, AgentType } from '../../types';
import { AGENT_TYPES } from '../../services/aiAgents';
import { GlassCard } from '../Layout/GlassCard';
import { StreamingInsightsContainer, StreamingInsight } from './StreamingInsight';

interface AgentPanelProps {
  agentOutputs: AgentOutput[];
  streamingInsights?: StreamingInsight[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ 
  agentOutputs, 
  streamingInsights = []
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedOutput, setExpandedOutput] = useState<string | null>(null);

  const groupedOutputs = agentOutputs.reduce((acc, output) => {
    if (!acc[output.agentType]) {
      acc[output.agentType] = [];
    }
    acc[output.agentType].push(output);
    return acc;
  }, {} as Record<string, AgentOutput[]>);

  const getAgentType = (agentId: string): AgentType | undefined => {
    return AGENT_TYPES.find(agent => agent.id === agentId);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <GlassCard className="h-full flex flex-col bg-slate-800/60 border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Agent Insights
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Real-time analysis from {AGENT_TYPES.length} specialized agents
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Agent Type Selector */}
        <div className="p-2 sm:p-4 border-b border-slate-700/50">
          <div className="max-h-48 sm:max-h-64 lg:max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70">
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2 gap-1 sm:gap-2 pr-1 sm:pr-2">
            {AGENT_TYPES.map((agent) => {
              const outputCount = groupedOutputs[agent.id]?.length || 0;
              const isActive = selectedAgent === agent.id;
              
              return (
                <motion.button
                  key={agent.id}
                  onClick={() => setSelectedAgent(isActive ? null : agent.id)}
                  className={`
                    p-2 sm:p-3 rounded-lg border transition-all text-left w-full min-h-[60px] sm:min-h-[auto]
                    ${isActive 
                      ? 'bg-slate-700/60 border-slate-600/60' 
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                      <span className="text-base sm:text-lg flex-shrink-0">{agent.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                          {agent.name}
                        </div>
                        {outputCount > 0 && (
                          <div className="text-xs text-slate-400 hidden sm:block">
                            {outputCount} insight{outputCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    {outputCount > 0 && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full flex-shrink-0 ml-1" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

        {/* Streaming Insights */}
        {streamingInsights && streamingInsights.length > 0 && (
          <div className="p-2 sm:p-4 border-b border-slate-700/50">
            <StreamingInsightsContainer
              insights={streamingInsights}
              agentTypes={AGENT_TYPES}
            />
          </div>
        )}

        {/* Agent Outputs */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70">
            <AnimatePresence>
              {selectedAgent ? (
                <motion.div
                  key={selectedAgent}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2 sm:space-y-4"
                >
                  {groupedOutputs[selectedAgent]?.map((output) => (
                    <AgentOutputCard
                      key={output.id}
                      output={output}
                      agentType={getAgentType(output.agentType)!}
                      isExpanded={expandedOutput === output.id}
                      onToggleExpanded={() => 
                        setExpandedOutput(expandedOutput === output.id ? null : output.id)
                      }
                      formatTime={formatTime}
                    />
                  )) || (
                    <div className="text-center text-slate-500 py-4 sm:py-8 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70">
                      <div className="space-y-3">
                        <div className="text-slate-400">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium">No insights yet from this agent</p>
                        <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                          This agent will analyze your conversation and provide insights when speech is detected. Start recording to see real-time analysis.
                        </p>
                        <div className="flex justify-center space-x-2 pt-2">
                          <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-slate-500 py-4 sm:py-8 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70"
                >
                  <div className="space-y-3">
                    <div className="text-slate-400">
                      <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">Select an agent to view insights</p>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                      AI agents will analyze your speech in real-time and provide detailed insights, suggestions, and analysis based on your conversation.
                    </p>
                    <div className="flex justify-center space-x-1 pt-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

interface AgentOutputCardProps {
  output: AgentOutput;
  agentType: AgentType;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  formatTime: (date: Date) => string;
}

const AgentOutputCard: React.FC<AgentOutputCardProps> = ({
  output,
  agentType,
  isExpanded,
  onToggleExpanded,
  formatTime
}) => {
  return (
    <motion.div
      layout
      className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 sm:p-4 hover:bg-slate-800/60 transition-all"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base sm:text-lg flex-shrink-0">{agentType.icon}</span>
          <div className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 min-w-0">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formatTime(output.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
            {Math.round(output.provenance.confidence * 100)}%
          </div>
          <button
            onClick={onToggleExpanded}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-slate-200 mb-1">Analysis</h4>
          <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-track-slate-700/30 scrollbar-thumb-slate-600/50">
            <p className="text-sm text-slate-300 leading-relaxed pr-2">
              {output.provenance.outputs?.analysis || 'No analysis available'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-200 mb-2">Key Insights</h4>
          <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-slate-700/30 scrollbar-thumb-slate-600/50">
            <ul className="space-y-1 pr-2">
              {(output.provenance.outputs?.insights || []).map((insight, index) => (
                <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  <span className="leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-3 border-t border-slate-700/50"
          >
            <div>
              <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" />
                Reasoning Chain
              </h4>
              <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-slate-700/30 scrollbar-thumb-slate-600/50">
                <ol className="space-y-2 pr-2">
                  {(output.provenance.outputs?.reasoning_chain || []).map((step, index) => (
                    <li key={index} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-blue-400 flex-shrink-0">{index + 1}.</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Trace ID:</span>
                <div className="text-slate-400 font-mono break-all">
                  {output.provenance.trace_id.slice(0, 8)}...
                </div>
              </div>
              <div>
                <span className="text-slate-500">Agent:</span>
                <div className="text-slate-400">
                  {agentType.name}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Streaming Insight Card Component for real-time ChatGPT-like experience
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{agentType.icon}</span>
        <span className="text-xs font-medium text-blue-300">{agentType.name}</span>
        {isProcessing && (
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
      <div className="text-sm text-slate-300 leading-relaxed">
        <TypewriterText text={streamingText} isStreaming={isProcessing} />
        {isProcessing && (
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block ml-1 w-2 h-4 bg-blue-400"
          />
        )}
      </div>
    </motion.div>
  );
};

// Typewriter effect component
interface TypewriterTextProps {
  text: string;
  isStreaming: boolean;
  speed?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  isStreaming, 
  speed = 50 
}) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (text.length === 0) {
      setDisplayText('');
      setCurrentIndex(0);
      return;
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (!isStreaming && displayText !== text) {
      // Ensure final text is displayed when streaming stops
      setDisplayText(text);
    }
  }, [text, currentIndex, isStreaming, speed, displayText]);

  // Reset when text changes significantly (new streaming session)
  React.useEffect(() => {
    if (text.length < displayText.length) {
      setDisplayText('');
      setCurrentIndex(0);
    }
  }, [text, displayText.length]);

  return <span>{displayText}</span>;
};