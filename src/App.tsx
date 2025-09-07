import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Meeting } from './pages/Meeting';
import { analytics } from './lib/firebase';
import { logEvent } from 'firebase/analytics';

type AppState = 'landing' | 'dashboard' | 'meeting';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('landing');
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
    setCurrentState('dashboard');
  };

  const handleStartMeeting = (sessionId: string) => {
    if (analytics) {
      logEvent(analytics, 'meeting_started', { session_id: sessionId });
    }
    setCurrentSessionId(sessionId);
    setCurrentState('meeting');
  };

  const handleBackToDashboard = () => {
    if (analytics) {
      logEvent(analytics, 'back_to_dashboard');
    }
    setCurrentState('dashboard');
    setCurrentSessionId(null);
  };

  const handleBackToLanding = () => {
    if (analytics) {
      logEvent(analytics, 'back_to_landing');
    }
    setCurrentState('landing');
    setCurrentSessionId(null);
  };

  // Show different views based on state
  switch (currentState) {
    case 'landing':
      return (
        <ErrorBoundary>
          <Landing onGetStarted={handleGetStarted} />
        </ErrorBoundary>
      );
    
    case 'meeting':
      return currentSessionId ? (
        <ErrorBoundary>
          <Meeting 
            sessionId={currentSessionId}
            onBack={handleBackToDashboard}
            onBackToLanding={handleBackToLanding}
          />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Dashboard onStartMeeting={handleStartMeeting} />
        </ErrorBoundary>
      );
    
    case 'dashboard':
    default:
      return (
        <ErrorBoundary>
          <Dashboard onStartMeeting={handleStartMeeting} />
        </ErrorBoundary>
      );
  }
}

export default App;