import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Users, Clock, Brain, Lightbulb, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/Layout/GlassCard';
import { AnimatedBackground } from '../components/Layout/AnimatedBackground';

interface AnalysisData {
  meetingDuration: string;
  participantCount: number;
  keyTopics: string[];
  sentimentScore: number;
  actionItems: string[];
  insights: string[];
  transcriptSummary: string;
  engagementMetrics: {
    averageSpeakingTime: string;
    mostActiveParticipant: string;
    quietPeriods: number;
  };
}

const Analysis: React.FC = () => {
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading analysis data
    const timer = setTimeout(() => {
      setAnalysisData({
        meetingDuration: "45m 32s",
        participantCount: 5,
        keyTopics: ["Product Roadmap", "Q4 Planning", "Resource Allocation", "Market Analysis"],
        sentimentScore: 0.75,
        actionItems: [
          "Schedule follow-up meeting with engineering team",
          "Prepare market research presentation",
          "Review budget allocation for Q4",
          "Send meeting notes to all stakeholders"
        ],
        insights: [
          "High engagement throughout the meeting",
          "Strong consensus on product direction",
          "Resource constraints identified early",
          "Clear next steps established"
        ],
        transcriptSummary: "The meeting focused on Q4 planning with discussion around product roadmap priorities, resource allocation, and market positioning. All participants actively contributed with strong alignment on strategic direction.",
        engagementMetrics: {
          averageSpeakingTime: "8m 15s",
          mostActiveParticipant: "Sarah Johnson",
          quietPeriods: 3
        }
      });
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleExportReport = () => {
    // Simulate report export
    console.log('Exporting analysis report...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <GlassCard className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Analyzing meeting data...</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-8 h-8" />
              <span>Meeting Analysis</span>
            </h1>
          </div>
          
          <button
            onClick={handleExportReport}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-200 text-white"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Main Analysis Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Metrics */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Meeting Overview</span>
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-white font-medium">{analysisData?.meetingDuration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Participants:</span>
                  <span className="text-white font-medium">{analysisData?.participantCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Sentiment:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full" 
                        style={{ width: `${(analysisData?.sentimentScore || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-emerald-400 font-medium">
                      {Math.round((analysisData?.sentimentScore || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Engagement Metrics</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-300 text-sm">Average Speaking Time</span>
                  <p className="text-white font-medium">{analysisData?.engagementMetrics.averageSpeakingTime}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-sm">Most Active Participant</span>
                  <p className="text-white font-medium">{analysisData?.engagementMetrics.mostActiveParticipant}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-sm">Quiet Periods</span>
                  <p className="text-white font-medium">{analysisData?.engagementMetrics.quietPeriods}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Main Analysis Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Topics */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Key Topics Discussed</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {analysisData?.keyTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm border border-blue-500/30"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </GlassCard>

            {/* AI Insights */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI-Generated Insights</span>
              </h2>
              <div className="space-y-3">
                {analysisData?.insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">{insight}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Action Items */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Action Items</span>
              </h2>
              <div className="space-y-3">
                {analysisData?.actionItems.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Meeting Summary */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Meeting Summary</h2>
              <p className="text-gray-300 leading-relaxed">{analysisData?.transcriptSummary}</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;