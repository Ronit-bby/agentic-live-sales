import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User } from 'lucide-react';
import { TranscriptEntry } from '../../types';
import { GlassCard } from '../Layout/GlassCard';

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  isRecording: boolean;
  currentInterim?: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ entries, isRecording, currentInterim }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <GlassCard className="h-full flex flex-col bg-slate-800/60 border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Live Transcript</h3>
          <div className="flex items-center gap-2">
            {isRecording && (
              <motion.div
                className="w-3 h-3 bg-emerald-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <span className="text-sm text-slate-400">
              {isRecording ? 'Recording' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-track-slate-800/50 scrollbar-thumb-slate-600/70 hover:scrollbar-thumb-slate-500"
      >
        <AnimatePresence>
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200">
                      {entry.speaker}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(entry.timestamp)}</span>
                    </div>
                    {entry.confidence && (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-300 text-sm leading-relaxed break-words">
                    {entry.text}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Show interim results while recording */}
          {isRecording && currentInterim && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="group opacity-70"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-400">
                      You
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>typing...</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
                      interim
                    </span>
                  </div>
                  
                  <p className="text-slate-400 text-sm leading-relaxed break-words italic">
                    {currentInterim}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {entries.length === 0 && !currentInterim && (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <p className="mb-2">
                {isRecording ? 'Listening for speech...' : 'Start recording to see transcript'}
              </p>
              {isRecording && (
                <p className="text-sm text-slate-600">
                  Make sure your microphone is enabled and speak clearly
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};