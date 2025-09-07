# Agentic Live Sales - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_MODEL=gpt-4
VITE_OPENAI_WHISPER_MODEL=whisper-1

# API Configuration
VITE_API_BASE_URL=http://localhost:5173
VITE_ENABLE_REAL_AI=true
```

### 3. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication → Email/Password provider
4. Create Firestore database in production mode
5. Copy your config from Project Settings

#### Firestore Collections
The app will automatically create these collections:
- `meetings` - Meeting sessions
- `transcripts` - Transcript entries  
- `agentOutputs` - AI agent analyses

#### Security Rules (Optional)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. OpenAI Setup
1. Create an [OpenAI account](https://platform.openai.com/)
2. Generate an API key from the API section
3. Add credits to your account for GPT-4 and Whisper usage
4. Add the API key to your `.env` file

### 5. Run the Application
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration Options

### AI Mode Configuration
- Set `VITE_ENABLE_REAL_AI=true` to use OpenAI APIs
- Set `VITE_ENABLE_REAL_AI=false` for demo mode (Web Speech API + mock AI)

### Transcription Methods
- **OpenAI Whisper** (when API key is provided): High accuracy, cloud-based
- **Web Speech API** (fallback): Browser-based, works offline

### Model Configuration
- `VITE_OPENAI_MODEL=gpt-4` - For AI agent analysis
- `VITE_OPENAI_WHISPER_MODEL=whisper-1` - For speech transcription

## 📋 Features

### ✅ Real-Time Transcription
- OpenAI Whisper API integration for high accuracy
- Web Speech API fallback for offline use
- Live interim results display
- Automatic speaker detection

### ✅ AI Agent Analysis
- **Sales Agent**: Buying signals, pain points, opportunities
- **HR Agent**: Team dynamics, communication patterns
- **Compliance Agent**: Regulatory issues, risk factors
- **Competitor Agent**: Market positioning, threats
- **Action Items Agent**: Tasks, deadlines, follow-ups

### ✅ Provenance Tracking
- Complete reasoning chain for each AI decision
- Input/output traceability
- Confidence scores and trace IDs
- Real-time streaming updates

### ✅ Firebase Integration
- Real-time data synchronization
- Automatic backup and persistence
- Multi-device access
- Offline capability with local storage fallback

## 🛠 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   ├── Layout/         # Layout components
│   └── Meeting/        # Meeting-specific components
├── hooks/              # Custom React hooks
├── lib/                # Configuration (Firebase)
├── pages/              # Main application pages
├── services/           # Business logic and API integrations
│   ├── openai.ts      # OpenAI API service
│   ├── transcription.ts # Real-time transcription
│   ├── aiAgents.ts    # AI agent implementations  
│   └── firestore.ts   # Firebase Firestore integration
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **AI**: OpenAI GPT-4, Whisper
- **Backend**: Firebase (Auth + Firestore)
- **Real-time**: Firebase listeners, WebRTC
- **Build**: Vite with production optimizations

## 🔒 Security Considerations

### Development vs Production
- Current setup uses `dangerouslyAllowBrowser: true` for OpenAI client
- **Production**: Move OpenAI calls to a secure backend server
- **API Keys**: Never expose OpenAI keys in production frontend

### Recommended Production Architecture
```
Frontend (React) → Backend API → OpenAI APIs
                → Firebase Firestore
                → Firebase Auth
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy Options
1. **Vercel**: Connect GitHub repo for automatic deployments
2. **Netlify**: Drag & drop `dist` folder
3. **Firebase Hosting**: `firebase deploy`
4. **AWS S3 + CloudFront**: Upload `dist` folder

### Environment Variables (Production)
Set these in your hosting platform:
- All `VITE_*` variables from your `.env`
- Ensure API keys are properly secured

## 📊 Monitoring & Analytics

### Performance Monitoring
- Firebase Performance SDK (optional)
- Real-time transcription latency tracking
- AI processing time metrics

### Error Tracking
- Console error logging
- Firebase error reporting
- Graceful fallbacks implemented

## 🔧 Troubleshooting

### Common Issues

#### Microphone Access Denied
- Ensure HTTPS in production
- Check browser permissions
- Fallback: Manual audio upload (planned feature)

#### OpenAI API Errors
- Verify API key is correct
- Check account credits/usage limits
- Monitor rate limits

#### Firebase Connection Issues
- Verify Firebase config
- Check Firestore security rules
- Ensure network connectivity

### Debug Mode
Add `?debug=1` to URL for additional console logging.

## 📈 Performance Optimizations

### Implemented
- Real-time Firebase listeners with limits
- Batch processing for multiple transcripts
- Streaming AI analysis for faster results
- Optimized bundle size with code splitting

### Recommended
- CDN for static assets
- Service worker for offline functionality
- WebRTC for P2P audio in meetings
- Background processing for AI analysis

## 🎯 Next Steps

1. **Security**: Move to backend API architecture
2. **Features**: Video support, meeting recordings
3. **Performance**: WebRTC integration, caching
4. **Analytics**: Usage tracking, performance metrics
5. **Mobile**: Progressive Web App features