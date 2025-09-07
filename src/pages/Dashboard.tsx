import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Clock, Users, Trash2 } from 'lucide-react';
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

  const mockUser = {
    uid: 'demo-user',
    displayName: 'Demo User',
    email: 'demo@example.com'
  };

  useEffect(() => {
    const savedSessions = localStorage.getItem('meetingSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt)
        }));
        setSessions(parsed);
      } catch {
        localStorage.removeItem('meetingSessions');
      }
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
    if (window.confirm('Are you sure you want to delete this meeting?')) {
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

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Recent Meetings</h2>
              </div>

              {loading ? (
                <div className="text-center py-8 text-white/50">Loading meetings...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-white/70 mb-4">No meetings yet. Create your first meeting to get started!</div>
                  <motion.button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Meeting
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-white">{session.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                            <span>{formatDate(session.createdAt)}</span>
                            <span>•</span>
                            <span>{session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{formatDuration(session.duration)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => onStartMeeting(session.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Continue
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            whileHover={{ scale: 1.1 }}
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

        {createModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">Create New Meeting</h2>
              <input
                type="text"
                placeholder="Meeting title..."
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionTitle.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};