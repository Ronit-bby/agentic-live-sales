import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Clock, BarChart3, Brain, Lightbulb, FileText, TrendingUp, Download } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { WhisperTranscriptionService } from '../services/transcription';
import { createAIAgents, AGENT_TYPES } from '../services/aiAgents';
import { firestoreService } from '../services/firestore';
import { openAIService } from '../services/openai';
import { MeetingSession, TranscriptEntry, AgentOutput } from '../types';
import { TranscriptPanel } from '../components/Meeting/TranscriptPanel';
import { AgentPanel } from '../components/Meeting/AgentPanel';
import { LiveInsightsPanel } from '../components/Meeting/LiveInsightsPanel';
import { RecordingControls } from '../components/Meeting/RecordingControls';
import { GlassCard } from '../components/Layout/GlassCard';
import { useAuth } from '../hooks/useAuth';
import { useStreamingInsights } from '../hooks/useStreamingInsights';

interface MeetingProps {
  sessionId: string;
  onBack: () => void;
  onBackToLanding: () => void;
}

export const Meeting: React.FC<MeetingProps> = ({ onBackToLanding }) => {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const sessionId = urlSessionId || 'default';
  const { user } = useAuth();
  const [session, setSession] = useState<MeetingSession | null>(null);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [agentOutputs, setAgentOutputs] = useState<AgentOutput[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcriptionService] = useState(() => new WhisperTranscriptionService());
  const [aiAgents] = useState(() => createAIAgents());
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [processingAgents, setProcessingAgents] = useState<Set<string>>(new Set());
  const [interimTranscript, setInterimTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [transcriptionMethod, setTranscriptionMethod] = useState('');
  const [lastProcessingTime, setLastProcessingTime] = useState<Date | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Streaming insights hook
  const {
    insights,
    addStreamingInsight,
    updateStreamingInsight,
    completeStreamingInsight
  } = useStreamingInsights();

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
      // Silently handle system status errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('System status check failed:', error);
      }
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
        // Only clear processing if we have completed outputs and no agents are processing
        if (outputs.length > 0 && processingAgents.size === 0) {
          setIsAIProcessing(false);
        }
      }
    );
    setUnsubscribeOutputs(() => unsubOutputs);
  };

  // Process new transcript entries with AI agents immediately
  useEffect(() => {
    if (transcriptEntries.length === 0) return;

    const latestEntry = transcriptEntries[transcriptEntries.length - 1];
    // Process every meaningful transcript entry for real-time insights
    if (latestEntry.text.length > 5) { // Process shorter text for faster insights
      processWithAIAgents(latestEntry);
    }
  }, [transcriptEntries]);

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
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to create session in Firebase, using local storage:', error);
          }
          // Fallback to localStorage
          setSession(newSession);
          saveSessionToLocalStorage(newSession);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize session from Firebase, using fallback:', error);
      }
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

  // Real-time AI processing with immediate streaming
  const processWithAIAgents = async (transcriptEntry: TranscriptEntry) => {
    setIsAIProcessing(true);
    setLastProcessingTime(new Date());
    
    // Get recent context
    const recentEntries = transcriptEntries.slice(-3);
    const context = recentEntries.map(entry => entry.text).join(' ');
    
    // Process with each AI agent for immediate insights
    const agentPromises = Array.from(aiAgents.entries()).map(async ([agentId, agent]) => {
      try {
        // Add agent to processing set immediately
        setProcessingAgents(prev => new Set([...prev, agentId]));
        
        // Create streaming insight for real-time display
        const insightId = addStreamingInsight(agentId);
        
        // Generate analysis immediately (no waiting for OpenAI)
        const provenance = await agent.analyze(transcriptEntry.text, context);
        
        // Simulate real-time streaming effect
        const analysisText = provenance.outputs.analysis || '';
        let currentText = '';
        
        // Stream character by character for ChatGPT-like effect
        for (let i = 0; i < analysisText.length; i += 3) {
          currentText += analysisText.substring(i, i + 3);
          updateStreamingInsight(insightId, currentText, provenance.confidence);
          await new Promise(resolve => setTimeout(resolve, 15)); // Fast typing speed
        }
        
        // Mark insight as complete
        completeStreamingInsight(insightId);
        
        // Create agent output
        const agentOutput: AgentOutput = {
          id: `${agentId}-${Date.now()}`,
          sessionId,
          agentType: agentId as any,
          provenance,
          createdAt: new Date()
        };

        // Save to Firebase and local state
        setAgentOutputs(prev => [...prev, agentOutput]);
        firestoreService.addAgentOutput(agentOutput).catch(() => {
          // Silently handle Firebase errors
        });
        
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error processing with ${agentId} agent:`, error);
        }
      } finally {
        // Remove agent from processing set
        setProcessingAgents(prev => {
          const newSet = new Set(prev);
          newSet.delete(agentId);
          return newSet;
        });
      }
    });

    await Promise.all(agentPromises);
    setIsAIProcessing(false);
  };

  const handleStartRecording = async () => {
    const success = await transcriptionService.startTranscription(
      sessionId,
      async (entry) => {
        try {
          // Immediately add to local state for instant UI update
          setTranscriptEntries(prev => [...prev, entry]);
          
          // Try to save to Firebase
          await firestoreService.addTranscriptEntry(entry);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to save transcript to Firebase:', error);
          }
          // Already added to local state, so UI shows the transcript
        }
      },
      (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Transcription error:', error);
        }
        alert(`Transcription error: ${error}`);
      },
      (interim) => {
        setInterimTranscript(interim);
      }
    );

    if (success) {
      setIsRecording(true);
      setStartTime(new Date());
      
      // Simulate some initial conversation for demo
      setTimeout(() => {
        if (transcriptEntries.length === 0) {
          const demoEntry: TranscriptEntry = {
            id: `demo-${Date.now()}`,
            sessionId,
            text: "Hello everyone, let's discuss our budget and timeline for this project.",
            speaker: currentUser.displayName || 'Demo Speaker',
            timestamp: new Date(),
            confidence: 0.95
          };
          setTranscriptEntries([demoEntry]);
        }
      }, 2000);
      
      // Add more demo entries to trigger multiple insights
      setTimeout(() => {
        const demoEntry2: TranscriptEntry = {
          id: `demo2-${Date.now()}`,
          sessionId,
          text: "We need to compare this with our competitors and make sure we're following compliance requirements.",
          speaker: 'Participant 2',
          timestamp: new Date(),
          confidence: 0.92
        };
        setTranscriptEntries(prev => [...prev, demoEntry2]);
      }, 5000);
      
      setTimeout(() => {
        const demoEntry3: TranscriptEntry = {
          id: `demo3-${Date.now()}`,
          sessionId,
          text: "Let's schedule a follow-up meeting and assign tasks to the team members.",
          speaker: 'Team Lead',
          timestamp: new Date(),
          confidence: 0.89
        };
        setTranscriptEntries(prev => [...prev, demoEntry3]);
      }, 8000);
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to update session in Firebase:', error);
        }
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

  // Generate analysis data from current meeting data
  const generateAnalysisData = () => {
    const keyTopics = agentOutputs
      .filter(output => output.agentType === 'domain-intelligence')
      .map(output => output.provenance.outputs.analysis || '')
      .join(' ')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 6);

    const insights = agentOutputs
      .filter(output => output.agentType === 'suggestion-generator')
      .map(output => output.provenance.outputs.analysis || 'No insights yet')
      .slice(0, 4);

    const actionItems = [
      'Review meeting transcript for key decisions',
      'Follow up on discussed action items',
      'Share insights with relevant stakeholders',
      'Schedule next meeting if needed'
    ];

    return {
      meetingDuration: formatDuration(duration),
      participantCount: session?.participants.length || 1,
      keyTopics: keyTopics.length > 0 ? keyTopics : ['Strategy', 'Planning', 'Discussion'],
      sentimentScore: 0.75,
      actionItems,
      insights: insights.length > 0 ? insights : ['Meeting analysis will appear here as the conversation progresses'],
      transcriptSummary: transcriptEntries.length > 0 
        ? `Meeting covered ${transcriptEntries.length} discussion points with active participation from ${session?.participants.length || 1} participants.`
        : 'Start recording to see meeting analysis and insights.',
      engagementMetrics: {
        averageSpeakingTime: duration > 0 ? formatDuration(Math.floor(duration / (session?.participants.length || 1))) : '0:00',
        mostActiveParticipant: session?.participants[0] || 'Unknown',
        quietPeriods: Math.floor(transcriptEntries.length / 3)
      }
    };
  };

  // Analysis Section Component
  const AnalysisSection: React.FC<{ analysisData: any }> = ({ analysisData }) => (
    <GlassCard className="p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Live Meeting Analysis
        </h2>
        <motion.button
          className="flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download className="w-4 h-4" />
          Export
        </motion.button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview Metrics */}
        <div className="space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Meeting Overview
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Duration:</span>
                <span className="text-sm text-white font-medium">{analysisData.meetingDuration}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Participants:</span>
                <span className="text-sm text-white font-medium">{analysisData.participantCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Sentiment:</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-slate-700 rounded-full h-1.5">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full" 
                      style={{ width: `${analysisData.sentimentScore * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">
                    {Math.round(analysisData.sentimentScore * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Engagement
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-slate-400">Avg Speaking Time</span>
                <p className="text-sm text-white font-medium">{analysisData.engagementMetrics.averageSpeakingTime}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Most Active</span>
                <p className="text-sm text-white font-medium">{analysisData.engagementMetrics.mostActiveParticipant}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Topics & Insights */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key Topics */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Key Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysisData.keyTopics.map((topic: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs border border-blue-500/30"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              AI Insights
            </h3>
            <div className="space-y-2">
              {analysisData.insights.slice(0, 3).map((insight: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-xs text-slate-300 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Action Items
            </h3>
            <div className="space-y-2">
              {analysisData.actionItems.slice(0, 3).map((item: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-xs text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );

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
              <motion.button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border border-slate-600/50 ${
                  showAnalysis 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">{showAnalysis ? 'Hide Analysis' : 'Show Analysis'}</span>
              </motion.button>
              
              <RecordingControls
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              />
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 p-6 min-h-0">
          {/* Live Streaming Insights */}
          <LiveInsightsPanel 
            streamingInsights={new Map(insights.map(insight => [insight.id, insight.content]))}
            processingAgents={processingAgents}
          />
          
          {/* Analysis Section - Conditionally Shown */}
          <AnimatePresence>
            {showAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <AnalysisSection analysisData={generateAnalysisData()} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Content Grid */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
            {/* Transcript Panel */}
            <motion.div
              className="flex-1 min-w-0 order-2 lg:order-1"
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
              className="w-full lg:w-96 flex-shrink-0 order-1 lg:order-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AgentPanel 
                agentOutputs={agentOutputs} 
                streamingInsights={insights}
              />
            </motion.div>
          </div>
        </div>

        {/* Enhanced AI Processing Footer */}
        <motion.div
          className="border-t border-slate-700/50 bg-slate-900/90 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Main Status Row */}
          <div className="p-4 border-b border-slate-800/50">
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
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span>{isRecording ? 'Live Recording' : 'Stopped'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Processing Status Row */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isAIProcessing ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-blue-400">
                      <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                      <span className="font-medium">AI Processing Active</span>
                    </div>
                    {lastProcessingTime && (
                      <span className="text-xs text-slate-500">
                        Started: {lastProcessingTime.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                    <span>AI Agents Ready</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {processingAgents.size > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Processing:</span>
                    <div className="flex items-center gap-2">
                      {Array.from(processingAgents).map(agentId => {
                        const agentType = AGENT_TYPES.find(a => a.id === agentId);
                        return agentType ? (
                          <div
                            key={agentId}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded-full text-xs border border-slate-700/50"
                          >
                            <span className="animate-pulse">{agentType.icon}</span>
                            <span className="text-slate-300">{agentType.name}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Agent Overview */}
            {!isAIProcessing && processingAgents.size === 0 && (
              <div className="mt-3 flex items-center gap-3 overflow-x-auto agent-scroll scrollbar-thin">
                <span className="text-xs text-slate-500 whitespace-nowrap">Available Agents:</span>
                {AGENT_TYPES.map(agentType => (
                  <div
                    key={agentType.id}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800/40 rounded-full text-xs border border-slate-700/30 whitespace-nowrap hover:bg-slate-800/60 transition-colors"
                  >
                    <span>{agentType.icon}</span>
                    <span className="text-slate-400">{agentType.name}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};