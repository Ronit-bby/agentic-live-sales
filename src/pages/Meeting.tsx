import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Clock, Settings } from 'lucide-react';
import { WhisperTranscriptionService } from '../services/transcription';
import { createAIAgents } from '../services/aiAgents';
import { firestoreService } from '../services/firestore';
import { openAIService } from '../services/openai';
import { MeetingSession, TranscriptEntry, AgentOutput } from '../types';
import { TranscriptPanel } from '../components/Meeting/TranscriptPanel';
import { AgentPanel } from '../components/Meeting/AgentPanel';
import { RecordingControls } from '../components/Meeting/RecordingControls';
import { GlassCard } from '../components/Layout/GlassCard';
import { AnimatedBackground } from '../components/Layout/AnimatedBackground';
import { useAuth } from '../hooks/useAuth';

interface MeetingProps {
  sessionId: string;
  onBack: () => void;
  onBackToLanding: () => void;
}

export const Meeting: React.FC<MeetingProps> = ({ sessionId, onBack, onBackToLanding }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<MeetingSession | null>(null);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [agentOutputs, setAgentOutputs] = useState<AgentOutput[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcriptionService] = useState(() => new WhisperTranscriptionService());
  const [aiAgents] = useState(() => createAIAgents());
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [transcriptionMethod, setTranscriptionMethod] = useState('');

  // Firebase unsubscribe functions
  const [unsubscribeTranscripts, setUnsubscribeTranscripts] = useState<(() => void) | null>(null);
  const [unsubscribeOutputs, setUnsubscribeOutputs] = useState<(() => void) | null>(null);

  // Mock user for demo - use real user when available
  const currentUser = user || {
    uid: 'demo-user',
    displayName: 'Demo User',
    email: 'demo@example.com'
  };

  useEffect(() => {
    initializeSession();
    setupFirebaseListeners();
    checkSystemStatus();
    
    return () => {
      // Cleanup Firebase listeners
      if (unsubscribeTranscripts) unsubscribeTranscripts();
      if (unsubscribeOutputs) unsubscribeOutputs();
    };
  }, [sessionId]);

  // System status check
  const checkSystemStatus = async () => {
    try {
      setConnectionStatus('connecting');
      const isConnected = await firestoreService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      setTranscriptionMethod(transcriptionService.getTranscriptionMethod());
    } catch (error) {
      console.error('System status check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Setup Firebase real-time listeners
  const setupFirebaseListeners = () => {
    // Listen to transcript entries
    const unsubTranscripts = firestoreService.subscribeToTranscriptEntries(
      sessionId,
      (entries) => {
        setTranscriptEntries(entries);
      }
    );
    setUnsubscribeTranscripts(() => unsubTranscripts);

    // Listen to agent outputs
    const unsubOutputs = firestoreService.subscribeToAgentOutputs(
      sessionId,
      (outputs) => {
        setAgentOutputs(outputs);
        setIsAIProcessing(false); // AI processing completed
      }
    );
    setUnsubscribeOutputs(() => unsubOutputs);
  };

  // Process new transcript entries with AI agents
  useEffect(() => {
    if (transcriptEntries.length === 0) return;

    const latestEntry = transcriptEntries[transcriptEntries.length - 1];
    // Only process if this is a new entry (not from initial load)
    const isNewEntry = transcriptEntries.length > 1 || isRecording;
    
    if (isNewEntry && latestEntry.text.length > 10) { // Only process meaningful text
      processWithAIAgents(latestEntry);
    }
  }, [transcriptEntries.length]);

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

  const initializeSession = async () => {
    try {
      // Try to load existing sessions for this user
      const existingSessions = await firestoreService.getMeetingSessions(currentUser.uid);
      const existingSession = existingSessions.find(s => s.id === sessionId);
      
      if (existingSession) {
        setSession(existingSession);
      } else {
        // Create new session if not found
        const newSession: MeetingSession = {
          id: sessionId,
          title: `Meeting Session - ${new Date().toLocaleString()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: currentUser.uid,
          isActive: false,
          participants: [currentUser.displayName || 'User'],
          duration: 0
        };
        
        try {
          // Try to create in Firebase first
          await firestoreService.createMeetingSession(newSession);
          setSession(newSession);
        } catch (error) {
          console.error('Failed to create session in Firebase, using local storage:', error);
          // Fallback to localStorage
          setSession(newSession);
          saveSessionToLocalStorage(newSession);
        }
      }
    } catch (error) {
      console.error('Failed to initialize session from Firebase, using fallback:', error);
      loadSessionFromLocalStorage();
    }
  };

  const saveSessionToLocalStorage = (sessionToSave: MeetingSession) => {
    const savedSessions = localStorage.getItem('meetingSessions');
    const sessions = savedSessions ? JSON.parse(savedSessions) : [];
    const updatedSessions = sessions.filter((s: any) => s.id !== sessionId);
    updatedSessions.push(sessionToSave);
    localStorage.setItem('meetingSessions', JSON.stringify(updatedSessions));
  };

  const loadSessionFromLocalStorage = () => {
    // Fallback to localStorage for offline mode
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
    const defaultSession: MeetingSession = {
      id: sessionId,
      title: 'Meeting Session (Offline)',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: currentUser.uid,
      isActive: false,
      participants: [currentUser.displayName || 'User'],
      duration: 0
    };
    setSession(defaultSession);
    saveSessionToLocalStorage(defaultSession);
  };

  // Real-time AI processing with Firebase streaming
  const processWithAIAgents = async (transcriptEntry: TranscriptEntry) => {
    if (isAIProcessing) return; // Prevent concurrent processing
    
    setIsAIProcessing(true);
    
    // Get recent context from Firebase
    try {
      const recentEntries = await firestoreService.getLatestTranscriptEntries(sessionId, 5);
      const context = recentEntries.map(entry => entry.text).join(' ');
      
      // Process with each AI agent in parallel for faster results
      const agentPromises = Array.from(aiAgents.entries()).map(async ([agentId, agent]) => {
        try {
          if (openAIService.isReady()) {
            // Use streaming analysis for real-time updates
            const outputId = await firestoreService.streamAgentOutput(
              sessionId,
              agentId,
              {
                agent_id: agentId,
                timestamp: new Date(),
                inputs: {
                  transcript_segment: transcriptEntry.text,
                  context,
                  previous_outputs: []
                },
                confidence: 0,
                trace_id: `${agentId}-${Date.now()}`
              },
              () => {} // Updates handled by Firebase listener
            );

            // Stream the analysis and update Firebase in real-time
            let analysisText = '';
            await agent.streamAnalysis(
              transcriptEntry.text,
              context,
              (chunk) => {
                analysisText += chunk;
                // Update Firebase with streaming content
                firestoreService.updateStreamingAgentOutput(outputId, {
                  analysis: analysisText
                }).catch(console.error);
              }
            );
          } else {
            // Fallback to regular analysis
            const provenance = await agent.analyze(transcriptEntry.text, context);
            
            const agentOutput: AgentOutput = {
              id: `${agentId}-${Date.now()}`,
              sessionId,
              agentType: agentId as any,
              provenance,
              createdAt: new Date()
            };

            await firestoreService.addAgentOutput(agentOutput);
          }
        } catch (error) {
          console.error(`Error processing with ${agentId} agent:`, error);
        }
      });

      await Promise.all(agentPromises);
    } catch (error) {
      console.error('Error in AI processing:', error);
      setIsAIProcessing(false);
    }
  };

  const handleStartRecording = async () => {
    const success = await transcriptionService.startTranscription(
      sessionId,
      async (entry) => {
        try {
          await firestoreService.addTranscriptEntry(entry);
          // AI processing will be triggered by Firebase listener
        } catch (error) {
          console.error('Failed to save transcript to Firebase:', error);
          // Fallback: process locally and save to localStorage
          setTranscriptEntries(prev => [...prev, entry]);
          processWithAIAgents(entry);
        }
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
      
      // Update session status
      if (session) {
        const updatedSession = {
          ...session,
          isActive: true,
          updatedAt: now
        };
        
        try {
          await firestoreService.updateMeetingSession(sessionId, updatedSession);
          setSession(updatedSession);
        } catch (error) {
          console.error('Failed to update session in Firebase:', error);
          // Fallback to localStorage
          setSession(updatedSession);
          saveSessionToLocalStorage(updatedSession);
        }
      }
    }
  };

  const handleStopRecording = async () => {
    transcriptionService.stopTranscription();
    setIsRecording(false);
    setInterimTranscript('');
    
    if (session && startTime) {
      const finalDuration = Math.floor((Date.now() - startTime.getTime()) / 60000);
      const updatedSession = {
        ...session,
        isActive: false,
        duration: finalDuration,
        updatedAt: new Date()
      };
      
      try {
        await firestoreService.updateMeetingSession(sessionId, updatedSession);
        setSession(updatedSession);
      } catch (error) {
        console.error('Failed to update session in Firebase:', error);
        // Fallback to localStorage
        setSession(updatedSession);
        saveSessionToLocalStorage(updatedSession);
      }
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
              <span className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-400' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                Firebase: {connectionStatus}
              </span>
              <span>Transcription: {transcriptionMethod}</span>
            </div>
            
            <div className="flex items-center gap-4">
              {isAIProcessing && (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>AI Processing...</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span>{isRecording ? 'Live' : 'Stopped'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};