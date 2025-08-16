# 🍅 FocusMate - Pomodoro Productivity Tracker

A minimal, demo-ready project consisting of a Chrome Extension (MV3) that runs a Pomodoro timer and logs active tab URLs, paired with a FastAPI backend that classifies URLs as productive/unproductive and provides daily analysis with motivational quotes.

![FocusMate Demo](https://img.shields.io/badge/Status-Demo%20Ready-brightgreen) ![Chrome Extension](https://img.shields.io/badge/Chrome-Extension%20MV3-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)

## ✨ Features

### Chrome Extension
- **Pomodoro Timer Presets**: 25/5, 45/10, 60/15 (work/break minutes)
- **Smart URL Logging**: Captures active tab URLs every 30 seconds during work intervals
- **Real-time Timer**: Visual countdown with work/break status
- **Productivity Analysis**: Daily stats with motivational quotes
- **Auto-loop Cycles**: Optional continuous Pomodoro sessions

### FastAPI Backend
- **URL Classification**: Smart categorization of productive vs unproductive sites
- **Daily Analytics**: Track productive hours, productivity percentage, and progress
- **Site Breakdown**: See where you spend the most time
- **Motivational Quotes**: Random inspiring quotes to keep you going
- **JSON Persistence**: No database required - uses local JSON file

## 🚀 Quick Start

### 1. Start the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://127.0.0.1:8000`

### 2. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The FocusMate extension should now appear in your toolbar

### 3. Start Using FocusMate

1. Click the FocusMate extension icon in Chrome
2. Choose your preferred Pomodoro preset (25/5 recommended for beginners)
3. Click **Start** to begin your focus session
4. During work intervals, the extension automatically logs your browsing activity
5. Click **Finish** after your session to see your productivity analysis

## 📊 API Endpoints

### Backend Endpoints

- **GET /** - Root endpoint with API info
- **GET /health** - Health check endpoint  
- **POST /activity** - Log user activity
  - Query params: `url`, `duration` (seconds), `user` (default: "guest")
- **GET /analysis/today** - Get today's productivity analysis
  - Query params: `user` (default: "guest")
- **GET /docs** - Swagger UI documentation

### Example API Usage

```bash
# Log activity
curl -X POST "http://127.0.0.1:8000/activity?url=https://github.com&duration=30&user=john"

# Get analysis
curl "http://127.0.0.1:8000/analysis/today?user=john"
```

## 🎯 Productivity Classification

### Productive Sites (Whitelist)
Educational and development-focused websites are classified as productive:
- Learning platforms: Coursera, Khan Academy, Udemy, edX
- Development: GitHub, Stack Overflow, Python docs
- Research: Wikipedia, arXiv, Medium articles
- Tools: Google Classroom, Colab, CodeAcademy

### Unproductive Sites (Blacklist)
Social media and entertainment sites are classified as unproductive:
- Social media: Instagram, Facebook, Twitter/X, Reddit
- Entertainment: Netflix, YouTube, Spotify, Twitch
- Streaming: Prime Video, Disney+, Hulu

### Neutral Sites
Sites not in either list are treated as neutral and don't affect productivity scores.

## 📁 Project Structure

```
FocusMate/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── activity.json        # Data persistence (created at runtime)
├── extension/
│   ├── manifest.json        # Chrome extension manifest (MV3)
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup interaction logic
│   ├── style.css           # Modern UI styling
│   ├── background.js       # Service worker for timer and logging
│   └── icons/              # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── README.md               # This file
```

## 🔧 Configuration

### Extension Settings
- **User**: Set your username (default: "guest")
- **Log Interval**: How often to capture URLs (15s, 30s, 60s)
- **Auto-continue**: Whether to automatically start the next cycle

### Backend Configuration
Edit `backend/main.py` to customize:
- **Productive sites**: Add/remove sites from `PRODUCTIVE_SITES` list
- **Unproductive sites**: Add/remove sites from `UNPRODUCTIVE_SITES` list
- **Motivational quotes**: Add your own quotes to `MOTIVATIONAL_QUOTES` list

## 📈 Data Format

The backend stores data in `activity.json`:

```json
{
  "2025-08-16": {
    "guest": {
      "productive": 3600,      // seconds
      "unproductive": 600,     // seconds
      "sites": {
        "github.com": 1800,    // seconds spent on each site
        "youtube.com": 600
      }
    }
  }
}
```

## 🛠️ Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Extension Development
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the FocusMate extension
4. Test your changes

### Adding New Features
- **Backend**: Add new endpoints in `main.py`
- **Extension**: Modify `popup.js` and `background.js` for new functionality
- **UI**: Update `popup.html` and `style.css` for interface changes

## 🐛 Troubleshooting

### Common Issues

**Backend not starting:**
- Ensure Python 3.7+ is installed
- Install dependencies: `pip install -r requirements.txt`
- Check if port 8000 is available

**Extension not loading URLs:**
- Verify the backend is running on `http://127.0.0.1:8000`
- Check browser console for errors (F12 → Console)
- Ensure you're on a valid website (not chrome:// pages)

**Timer not working:**
- Reload the extension: `chrome://extensions/` → refresh button
- Check the service worker console in Chrome DevTools

**No productivity data:**
- Make sure you've started a timer session and visited websites
- Check that URLs are being logged in the backend console
- Verify the activity.json file is being created in the backend directory

### Debug Mode

Enable debug logging by checking the browser console:
1. Right-click the extension icon → Inspect popup
2. Check Console tab for debug messages
3. For service worker logs: `chrome://extensions/` → FocusMate → service worker → inspect

## 🎉 Demo Scenarios

### Quick Demo (5 minutes)
1. Start backend: `uvicorn main:app --reload --port 8000`
2. Load extension in Chrome
3. Set timer to 25/5 preset
4. Start timer and visit github.com, youtube.com
5. Wait 1-2 minutes, then click Finish
6. See productivity analysis with site breakdown

### Full Demo (30 minutes)
1. Complete a full 25-minute Pomodoro session
2. Visit a mix of productive and unproductive sites
3. Analyze detailed productivity metrics
4. Try different presets and settings

## 🤝 Contributing

This is a hackathon-ready demo project. Feel free to:
- Add new productive/unproductive site classifications
- Improve the UI design
- Add more detailed analytics
- Implement user authentication
- Add data export features

## 📝 License

This project is open source and available under the MIT License.

## 🚀 Next Steps

Potential enhancements for a production version:
- [ ] User authentication and profiles
- [ ] Cloud data synchronization
- [ ] Advanced analytics and reporting
- [ ] Custom site categorization
- [ ] Team/collaborative features
- [ ] Mobile app companion
- [ ] Integration with productivity tools

---

**Happy focusing! 🎯**

Built with ❤️ for the productivity community. May your focus be sharp and your breaks be refreshing! 🍅
