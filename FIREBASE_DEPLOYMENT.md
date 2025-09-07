# Firebase Deployment Guide

## 🚀 Quick Deployment

Your project is now configured for Firebase hosting! Here's how to deploy:

### Prerequisites
1. Firebase CLI is installed globally
2. You're logged into Firebase CLI: `firebase login`
3. Project is built successfully

### Deployment Commands

#### Deploy Everything
```bash
npm run deploy
```

#### Deploy Only Hosting
```bash
npm run deploy:hosting
```

#### Manual Steps
```bash
# Build the project
npm run build

# Deploy to Firebase
firebase deploy
```

## 📁 Project Structure

### Firebase Configuration Files
- `firebase.json` - Firebase hosting configuration
- `.firebaserc` - Project aliases and settings

### Firebase Integration
- **Project ID**: `agentic-meeting-studio`
- **Hosting**: Configured to serve from `dist/` directory
- **Analytics**: Integrated with measurement ID `G-TTM990Q3SQ`
- **Single Page App**: All routes redirect to `/index.html`

## 🔧 Firebase Services Integrated

### 1. **Hosting**
- ✅ Configured for SPA routing
- ✅ Serves from `dist/` build output
- ✅ Ignores sensitive files

### 2. **Analytics**
- ✅ Google Analytics 4 integration
- ✅ Event tracking for user interactions
- ✅ App initialization tracking

### 3. **Authentication & Firestore**
- ✅ Already configured for user auth
- ✅ Firestore database integration
- ✅ Real-time meeting data

## 📊 Analytics Events

The app tracks these user interactions:
- `app_initialized` - When app loads
- `get_started_clicked` - Landing page CTA
- `meeting_started` - New meeting creation
- `back_to_dashboard` - Navigation events
- `back_to_landing` - Navigation events

## 🌐 Live URL

Once deployed, your app will be available at:
**https://agentic-meeting-studio.web.app**

## 🔧 Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Deployment Issues
```bash
# Check Firebase CLI status
firebase --version
firebase projects:list

# Re-authenticate if needed
firebase login --reauth
```

### Analytics Not Working
- Ensure you're testing on HTTPS (not localhost)
- Check browser console for any errors
- Analytics may take 24-48 hours to appear in Firebase console

## 🚀 Deployment Checklist

- [ ] Build project successfully (`npm run build`)
- [ ] Test locally (`npm run preview`)
- [ ] Deploy to Firebase (`npm run deploy`)
- [ ] Verify live site works
- [ ] Check Firebase console for analytics data

## 📝 Environment Variables

For local development, you can still use environment variables by creating a `.env.local` file:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
# ... other variables
```

But for production, the config is hardcoded in `src/lib/firebase.ts` for reliability.