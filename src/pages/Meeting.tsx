import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Clock, Settings } from 'lucide-react';
import { TranscriptionService } from '../services/transcription';
import { createAIAgents } from '../services/aiAgents';
import { MeetingSession, TranscriptEntry, AgentOutput } from '../types';
import { TranscriptPanel } from '../components/Meeting/TranscriptPanel';
import { AgentPanel } from '../components/Meeting/AgentPanel';
import { RecordingControls } from '../components/Meeting/RecordingControls';
import { GlassCard } from '../components/Layout/GlassCard';
import { AnimatedBackground } from '../components/Layout/AnimatedBackground';

interface MeetingProps {
  sessionId: string;
  onBack: () => void;
  onBackToLanding: () => void;
}

export const Meeting: React.FC<MeetingProps> = ({ sessionId, onBack, onBackToLanding }) => {
  const [session, setSession] = useState<MeetingSession | null>(null);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [agentOutputs, setAgentOutputs] = useState<AgentOutput[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcriptionService] = useState(() => new TranscriptionService());
  const [aiAgents] = useState(() => createAIAgents());
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // Mock user for demo
  const mockUser = {
    uid: 'demo-user',
    displayName: 'Demo User',
    email: 'demo@example.com'
  };

  useEffect(() => {
    loadSession();
    loadStoredData();
  }, [sessionId]);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && startTime) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  // Process new transcript entries with AI agents
  useEffect(() => {
    if (transcriptEntries.length === 0) return;

    const latestEntry = transcriptEntries[transcriptEntries.length - 1];
    processWithAIAgents(latestEntry);
  }, [transcriptEntries.length]);

  const loadSession = () => {
    // Load session from localStorage or create new one
    const savedSessions = localStorage.getItem('meetingSessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      const currentSession = sessions.find((s: any) => s.id === sessionId);
      if (currentSession) {
        setSession({
          ...currentSession,
          createdAt: new Date(currentSession.createdAt),
          updatedAt: new Date(currentSession.updatedAt)
        });
        return;
      }
    }
    
    // Create default session if not found
    setSession({
      id: sessionId,
      title: 'Current Meeting Session',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: mockUser.uid,
      isActive: false,
      participants: [mockUser.displayName],
      duration: 0
    });
  };

  const loadStoredData = () => {
    // Load transcript entries from localStorage
    const savedTranscripts = localStorage.getItem(`transcripts-${sessionId}`);
    if (savedTranscripts) {
      const transcripts = JSON.parse(savedTranscripts).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
      setTranscriptEntries(transcripts);
    }

    // Load agent outputs from localStorage
    const savedOutputs = localStorage.getItem(`agentOutputs-${sessionId}`);
    if (savedOutputs) {
      const outputs = JSON.parse(savedOutputs).map((output: any) => ({
        ...output,
        createdAt: new Date(output.createdAt),
        provenance: {
          ...output.provenance,
          timestamp: new Date(output.provenance.timestamp)
        }
      }));
      setAgentOutputs(outputs);
    }
  };

  const saveTranscriptEntry = (entry: TranscriptEntry) => {
    const newEntries = [...transcriptEntries, entry];
    setTranscriptEntries(newEntries);
    localStorage.setItem(`transcripts-${sessionId}`, JSON.stringify(newEntries));
  };

  const saveAgentOutput = (output: AgentOutput) => {
    const newOutputs = [...agentOutputs, output];
    setAgentOutputs(newOutputs);
    localStorage.setItem(`agentOutputs-${sessionId}`, JSON.stringify(newOutputs));
  };

  const processWithAIAgents = async (transcriptEntry: TranscriptEntry) => {
    // Process with each AI agent
    for (const [agentId, agent] of aiAgents) {
      try {
        const context = transcriptEntries
          .slice(-5)
          .map(entry => entry.text)
          .join(' ');

        const provenance = await agent.analyze(transcriptEntry.text, context);
        
        const agentOutput: AgentOutput = {
          id: `${agentId}-${Date.now()}`,
          sessionId,
          agentType: agentId as any,
          provenance,
          createdAt: new Date()
        };

        saveAgentOutput(agentOutput);
      } catch (error) {
        console.error(`Error processing with ${agentId} agent:`, error);
      }
    }
  };

  const handleStartRecording = async () => {
    const success = await transcriptionService.startTranscription(
      sessionId,
      (entry) => {
        saveTranscriptEntry(entry);
      },
      (error) => {
        console.error('Transcription error:', error);
        alert(`Transcription error: ${error}`);
      },
      (interim) => {
        setInterimTranscript(interim);
      }
    );

    if (success) {
      setIsRecording(true);
      const now = new Date();
      setStartTime(now);
      
      // Update session status in localStorage
      if (session) {
        const updatedSession = {
          ...session,
          isActive: true,
          updatedAt: now
        };
        setSession(updatedSession);
        updateSessionInStorage(updatedSession);
      }
    }
  };

  const handleStopRecording = () => {
    transcriptionService.stopTranscription();
    setIsRecording(false);
    setInterimTranscript(''); // Clear interim text when stopping
    
    if (session && startTime) {
      const finalDuration = Math.floor((Date.now() - startTime.getTime()) / 60000); // Convert to minutes
      const updatedSession = {
        ...session,
        isActive: false,
        duration: finalDuration,
        updatedAt: new Date()
      };
      setSession(updatedSession);
      updateSessionInStorage(updatedSession);
    }
  };

  const updateSessionInStorage = (updatedSession: MeetingSession) => {
    const savedSessions = localStorage.getItem('meetingSessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      const updatedSessions = sessions.map((s: any) => 
        s.id === sessionId ? updatedSession : s
      );
      localStorage.setItem('meetingSessions', JSON.stringify(updatedSessions));
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Professional subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.1),transparent_50%)] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_50%)]" />
      
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <motion.header
          className="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={onBackToLanding}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all border border-slate-600/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Home</span>
              </motion.button>
              
              <div>
                <h1 className="text-xl font-semibold text-slate-100">
                  {session?.title || 'Meeting Session'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(duration)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {session?.participants.length || 0} participants
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <RecordingControls
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              />
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 min-h-0">
          {/* Transcript Panel */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TranscriptPanel 
              entries={transcriptEntries}
              isRecording={isRecording}
              currentInterim={interimTranscript}
            />
          </motion.div>

          {/* Agent Panel */}
          <motion.div
            className="w-96 flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AgentPanel agentOutputs={agentOutputs} />
          </motion.div>
        </div>

        {/* Status Bar */}
        <motion.div
          className="p-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center gap-6">
              <span>Transcripts: {transcriptEntries.length}</span>
              <span>AI Insights: {agentOutputs.length}</span>
              <span>Agents Active: {aiAgents.size}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{isRecording ? 'Live' : 'Stopped'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};