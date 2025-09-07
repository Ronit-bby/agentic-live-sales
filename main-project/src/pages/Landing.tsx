import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Mic, Shield, Zap, ArrowRight, Users, Target, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/Layout/GlassCard';
import { AnimatedBackground } from '../components/Layout/AnimatedBackground';

interface LandingProps {
  onGetStarted: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    onGetStarted();
    navigate('/dashboard');
  };
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'AI-Powered Analysis',
      description: '5 specialized agents providing real-time insights during your meetings'
    },
    {
      icon: <Mic className="w-8 h-8" />,
      title: 'Live Transcription',
      description: 'OpenAI Whisper integration for accurate, real-time speech-to-text'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Complete Provenance',
      description: 'Full traceability of AI decisions with expandable reasoning chains'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Real-time Updates',
      description: 'Instant synchronization across all participants and devices'
    }
  ];

  const agents = [
    { icon: '💰', name: 'Sales Agent', description: 'Identifies opportunities and buying signals' },
    { icon: '👥', name: 'HR Agent', description: 'Analyzes team dynamics and performance' },
    { icon: '🔒', name: 'Compliance Agent', description: 'Monitors regulatory and risk factors' },
    { icon: '🎯', name: 'Competitive Agent', description: 'Tracks competitor mentions and positioning' },
    { icon: '✅', name: 'Action Items Agent', description: 'Extracts tasks and follow-ups' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          className="p-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Agentic Meeting Studio</h1>
            </div>
            
            <motion.button
              onClick={handleGetStarted}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </div>
        </motion.header>

        {/* Hero Section */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Meetings Enhanced by
              <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                {' '}AI Intelligence
              </span>
            </motion.h2>
            
            <motion.p
              className="text-xl text-white/80 mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Transform your meetings with real-time AI analysis, live transcription, 
              and complete insight provenance. Five specialized agents work together 
              to extract maximum value from every conversation.
            </motion.p>
            
            <motion.button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center gap-3 mx-auto transition-all"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Your First Meeting
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.h3
              className="text-3xl font-bold text-white text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Production-Ready Features
            </motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <GlassCard className="p-6 h-full hover:bg-white/15 transition-all">
                    <div className="text-blue-400 mb-4">
                      {feature.icon}
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-3">
                      {feature.title}
                    </h4>
                    <p className="text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Agents Section */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.h3
              className="text-3xl font-bold text-white text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Meet Your AI Team
            </motion.h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <GlassCard className="p-6 hover:bg-white/15 transition-all" hover>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-3xl">{agent.icon}</div>
                      <h4 className="text-lg font-semibold text-white">
                        {agent.name}
                      </h4>
                    </div>
                    <p className="text-white/70 leading-relaxed">
                      {agent.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <GlassCard className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center mb-3">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">5</div>
                  <div className="text-white/70">Specialized AI Agents</div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center justify-center mb-3">
                    <Clock className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">&lt;2s</div>
                  <div className="text-white/70">Real-time Analysis</div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center justify-center mb-3">
                    <Target className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">95%</div>
                  <div className="text-white/70">Transcription Accuracy</div>
                </motion.div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <GlassCard className="p-12">
              <motion.h3
                className="text-4xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Ready to Transform Your Meetings?
              </motion.h3>
              
              <motion.p
                className="text-xl text-white/80 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Join the future of intelligent meetings with complete AI-powered analysis 
                and full insight provenance.
              </motion.p>
              
              <motion.button
                onClick={onGetStarted}
                className="px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg font-semibold rounded-xl transition-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started Now
              </motion.button>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
};