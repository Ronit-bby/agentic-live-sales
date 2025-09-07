import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Clock, Users, Settings, Trash2 } from 'lucide-react';
import { MeetingSession } from '../types';
import { GlassCard } from '../components/Layout/GlassCard';
import { AnimatedBackground } from '../components/Layout/AnimatedBackground';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  onStartMeeting: (sessionId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartMeeting }) => {
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  // Mock user for demo purposes
  const mockUser = {
    uid: 'demo-user',
    displayName: 'Demo User',
    email: 'demo@example.com'
  };

  useEffect(() => {
    // Load sessions from localStorage for demo
    const savedSessions = localStorage.getItem('meetingSessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      }));
      setSessions(parsed);
    }
    setLoading(false);
  }, []);

  const saveSessions = (newSessions: MeetingSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('meetingSessions', JSON.stringify(newSessions));
  };

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) return;

    const sessionId = uuidv4();
    const session: MeetingSession = {
      id: sessionId,
      title: newSessionTitle.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: mockUser.uid,
      isActive: false,
      participants: [mockUser.displayName],
      duration: 0
    };

    const newSessions = [session, ...sessions];
    saveSessions(newSessions);
    setCreateModalOpen(false);
    setNewSessionTitle('');
    onStartMeeting(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      const newSessions = sessions.filter(s => s.id !== sessionId);
      saveSessions(newSessions);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          className="p-6 border-b border-white/20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Meeting Dashboard</h1>
              <p className="text-white/70 mt-1">Welcome back, {mockUser.displayName}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5" />
                New Meeting
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{sessions.length}</div>
                    <div className="text-white/70">Total Meetings</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatDuration(sessions.reduce((acc, s) => acc + s.duration, 0))}
                    </div>
                    <div className="text-white/70">Total Duration</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {Math.round(sessions.reduce((acc, s) => acc + s.participants.length, 0) / Math.max(sessions.length, 1))}
                    </div>
                    <div className="text-white/70">Avg Participants</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Meeting Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Recent Meetings</h2>
              </div>

              {loading ? (
                <div className="text-center py-8 text-white/50">
                  Loading meetings...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No meetings yet</h3>
                  <p className="text-white/70 mb-6">Create your first meeting to get started with AI-powered analysis</p>
                  <motion.button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Create First Meeting
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {session.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-white/70">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(session.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(session.duration)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {session.participants.length} participants
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            onClick={() => onStartMeeting(session.id)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-medium transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Continue
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Create Meeting Modal */}
        {createModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => e.target === e.currentTarget && setCreateModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Create New Meeting</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Meeting Title
                    </label>
                    <input
                      type="text"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="Enter meeting title..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <motion.button
                      onClick={handleCreateSession}
                      disabled={!newSessionTitle.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Create & Start
                    </motion.button>
                    <motion.button
                      onClick={() => setCreateModalOpen(false)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};