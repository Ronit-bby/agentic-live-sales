import React, { useState } from 'react';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Meeting } from './pages/Meeting';

type AppState = 'landing' | 'dashboard' | 'meeting';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleGetStarted = () => {
    setCurrentState('dashboard');
  };

  const handleStartMeeting = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentState('meeting');
  };

  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setCurrentSessionId(null);
  };

  const handleBackToLanding = () => {
    setCurrentState('landing');
    setCurrentSessionId(null);
  };

  // Show different views based on state
  switch (currentState) {
    case 'landing':
      return <Landing onGetStarted={handleGetStarted} />;
    
    case 'meeting':
      return currentSessionId ? (
        <Meeting 
          sessionId={currentSessionId}
          onBack={handleBackToDashboard}
          onBackToLanding={handleBackToLanding}
        />
      ) : (
        <Dashboard onStartMeeting={handleStartMeeting} />
      );
    
    case 'dashboard':
    default:
      return <Dashboard onStartMeeting={handleStartMeeting} />;
  }
}

export default App;