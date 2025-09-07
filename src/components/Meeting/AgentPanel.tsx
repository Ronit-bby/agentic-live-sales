import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Info, Clock, Brain } from 'lucide-react';
import { AgentOutput, AgentType } from '../../types';
import { AGENT_TYPES } from '../../services/aiAgents';
import { GlassCard } from '../Layout/GlassCard';

interface AgentPanelProps {
  agentOutputs: AgentOutput[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ agentOutputs }) => {
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
        <div className="p-4 border-b border-slate-700/50">
          <div className="grid grid-cols-2 gap-2">
            {AGENT_TYPES.map((agent) => {
              const outputCount = groupedOutputs[agent.id]?.length || 0;
              const isActive = selectedAgent === agent.id;
              
              return (
                <motion.button
                  key={agent.id}
                  onClick={() => setSelectedAgent(isActive ? null : agent.id)}
                  className={`
                    p-3 rounded-lg border transition-all text-left
                    ${isActive 
                      ? 'bg-slate-700/60 border-slate-600/60' 
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {agent.name}
                        </div>
                        {outputCount > 0 && (
                          <div className="text-xs text-slate-400">
                            {outputCount} insight{outputCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    {outputCount > 0 && (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Agent Outputs */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/70">
            <AnimatePresence>
              {selectedAgent ? (
                <motion.div
                  key={selectedAgent}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
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
                    <div className="text-center text-slate-500 py-8">
                      No insights yet from this agent
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-slate-500 py-8"
                >
                  <div className="space-y-2">
                    <p>Select an agent to view insights</p>
                    <p className="text-sm text-slate-600">
                      AI agents will analyze your speech in real-time
                    </p>
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
      className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/60 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agentType.icon}</span>
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {formatTime(output.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
            {Math.round(output.provenance.confidence * 100)}%
          </div>
          <button
            onClick={onToggleExpanded}
            className="text-slate-400 hover:text-slate-200 transition-colors"
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
              {output.provenance.outputs.analysis}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-200 mb-2">Key Insights</h4>
          <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-slate-700/30 scrollbar-thumb-slate-600/50">
            <ul className="space-y-1 pr-2">
              {output.provenance.outputs.insights.map((insight, index) => (
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
                  {output.provenance.outputs.reasoning_chain.map((step, index) => (
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