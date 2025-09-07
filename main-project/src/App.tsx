import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Meeting } from './pages/Meeting';
import Analysis from './pages/Analysis';
import { analytics } from './lib/firebase';
import { logEvent } from 'firebase/analytics';

// Create a wrapper component to use useNavigate hook
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Track app initialization
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'app_initialized');
    }
  }, []);

  const handleGetStarted = () => {
    if (analytics) {
      logEvent(analytics, 'get_started_clicked');
    }
    navigate('/dashboard');
  };

  const handleStartMeeting = (sessionId: string) => {
    if (analytics) {
      logEvent(analytics, 'meeting_started', { session_id: sessionId });
    }
    setCurrentSessionId(sessionId);
    navigate(`/meeting/${sessionId}`);
  };

  const handleBackToDashboard = () => {
    if (analytics) {
      logEvent(analytics, 'back_to_dashboard');
    }
    setCurrentSessionId(null);
  };

  const handleBackToLanding = () => {
    if (analytics) {
      logEvent(analytics, 'back_to_landing');
    }
    setCurrentSessionId(null);
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={<Landing onGetStarted={handleGetStarted} />} 
      />
      <Route 
        path="/dashboard" 
        element={<Dashboard onStartMeeting={handleStartMeeting} />} 
      />
      <Route 
        path="/meeting/:sessionId" 
        element={
          <Meeting 
            sessionId={currentSessionId || 'default'}
            onBack={handleBackToDashboard}
            onBackToLanding={handleBackToLanding}
          />
        } 
      />
      <Route 
        path="/analysis" 
        element={<Analysis />} 
      />
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </Router>
  );
}

export default App;