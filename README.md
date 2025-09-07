# Agentic Meeting Studio

A production-ready meeting intelligence platform powered by AI agents, real-time transcription, and complete provenance tracking.

## Features

### 🤖 AI-Powered Analysis
- **5 Specialized AI Agents**: Sales, HR, Compliance, Competitor Analysis, and Action Items
- **Real-time Processing**: Live analysis of meeting transcriptions
- **Complete Provenance**: Full traceability of AI decisions with expandable reasoning chains

### 🎤 Live Transcription
- **OpenAI Whisper Integration**: High-accuracy speech-to-text
- **Real-time Updates**: Instant transcription display
- **Multi-speaker Support**: Automatic speaker identification

### 🔒 Secure & Scalable
- **Firebase Authentication**: JWT-based secure login
- **Firestore Database**: Real-time data synchronization
- **Production Ready**: Modular, maintainable codebase

### 🎨 Modern UI/UX
- **Glass Morphism Design**: Beautiful liquid/glass UI elements
- **Framer Motion Animations**: Smooth, professional interactions
- **Responsive Layout**: Optimized for all device sizes

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project
- OpenAI API key (for production Whisper integration)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up Firebase**:
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your config to `.env` file

3. **Configure environment variables**:
```bash
cp .env.example .env
# Add your Firebase and OpenAI API keys
```

4. **Start development server**:
```bash
npm run dev
```

## Architecture

### Frontend Structure
```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication forms
│   ├── Layout/         # Layout components (GlassCard, etc.)
│   └── Meeting/        # Meeting-specific components
├── hooks/              # Custom React hooks
├── lib/                # External service configurations
├── pages/              # Main application pages
├── services/           # Business logic and API integrations
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Services

#### AI Agents (`services/aiAgents.ts`)
- **Sales Agent**: Identifies opportunities, pain points, buying signals
- **HR Agent**: Analyzes team dynamics, communication patterns
- **Compliance Agent**: Monitors regulatory issues and risk factors
- **Competitor Agent**: Tracks competitive mentions and positioning
- **Action Items Agent**: Extracts tasks, deadlines, follow-ups

#### Transcription (`services/transcription.ts`)
- Web Speech API fallback for development
- OpenAI Whisper integration for production
- Real-time audio processing and text generation

#### Firestore Integration (`services/firestore.ts`)
- Real-time data synchronization
- Meeting session management
- Transcript and agent output storage
- Complete data lifecycle management

## Data Models

### Meeting Session
```typescript
interface MeetingSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isActive: boolean;
  participants: string[];
  duration: number;
}
```

### Provenance Envelope
```typescript
interface ProvenanceEnvelope {
  agent_id: string;
  timestamp: Date;
  inputs: {
    transcript_segment: string;
    context: string;
    previous_outputs?: string[];
  };
  outputs: {
    analysis: string;
    insights: string[];
    confidence_score: number;
    reasoning_chain: string[];
  };
  confidence: number;
  trace_id: string;
}
```

## Deployment

### Firebase Setup
1. **Authentication**: Enable Email/Password provider
2. **Firestore**: Create database with the following collections:
   - `meetings` - Meeting sessions
   - `transcripts` - Transcript entries
   - `agentOutputs` - AI agent analyses

3. **Security Rules**: Configure appropriate Firestore security rules

### Production Deployment
1. **Build the application**:
```bash
npm run build
```

2. **Deploy to your preferred hosting platform**
3. **Set up environment variables** in your hosting platform
4. **Configure Firebase** for production environment

## Features in Detail

### Provenance Tracking
Every AI agent output includes complete provenance information:
- **Input Context**: What data the agent analyzed
- **Reasoning Chain**: Step-by-step decision process
- **Confidence Scores**: Reliability metrics
- **Trace IDs**: Unique identifiers for debugging

### Real-time Updates
- **Firestore Listeners**: Instant data synchronization
- **Live Transcript**: Real-time speech-to-text display
- **Agent Notifications**: Immediate AI analysis results

### Glass Morphism UI
- **Backdrop Blur Effects**: Modern glass-like appearance
- **Smooth Animations**: Framer Motion powered interactions
- **Responsive Design**: Optimized for all screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support

## Browser Compatibility

- **Chrome/Edge**: Full feature support including Web Speech API
- **Firefox**: Core features (manual Whisper integration recommended)
- **Safari**: Core features (manual Whisper integration recommended)
- **Mobile**: Responsive design with touch-optimized interactions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details