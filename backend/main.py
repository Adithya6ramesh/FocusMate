"""
FocusMate FastAPI Backend
A minimal FastAPI backend for the FocusMate Chrome extension.
Tracks productive vs unproductive activity and provides daily analysis.
"""

import json
import os
import random
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FocusMate API", version="1.0.0")

# Enable CORS for Chrome extensions and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",
        "http://localhost:*",
        "http://127.0.0.1:*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread lock for file operations
file_lock = threading.Lock()

# Data file path
DATA_FILE = "activity.json"

# Productive sites whitelist (education, development, learning)
PRODUCTIVE_SITES = [
    "coursera.org", "khanacademy.org", "udemy.com", "classroom.google.com",
    "github.com", "stackoverflow.com", "wikipedia.org", "leetcode.com",
    "geeksforgeeks.org", "towardsdatascience.com", "arxiv.org", "openai.com",
    "docs.python.org", "colab.research.google.com", "medium.com",
    "codecademy.com", "freecodecamp.org", "edx.org", "pluralsight.com",
    "lynda.com", "skillshare.com", "brilliant.org", "mit.edu", "stanford.edu"
]

# Unproductive sites blacklist (social media, entertainment)
UNPRODUCTIVE_SITES = [
    "instagram.com", "facebook.com", "twitter.com", "x.com", "reddit.com",
    "netflix.com", "primevideo.com", "spotify.com", "hotstar.com",
    "youtube.com", "tiktok.com", "snapchat.com", "discord.com",
    "twitch.tv", "hulu.com", "disneyplus.com", "pinterest.com"
]

# Motivational quotes pool
MOTIVATIONAL_QUOTES = [
    "Focus today, shine tomorrow.",
    "Every moment of focus builds your future.",
    "Productivity is never an accident. It's the result of commitment.",
    "Small progress is still progress. Keep going!",
    "Your focus determines your reality.",
    "Success is the sum of small efforts repeated day in and day out.",
    "The way to get started is to quit talking and begin doing.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
    "Concentrate all your thoughts upon the work at hand."
]


def today_str() -> str:
    """Get today's date as a string in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


def yesterday_str() -> str:
    """Get yesterday's date as a string in YYYY-MM-DD format."""
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime("%Y-%m-%d")


def get_host(url: str) -> str:
    """Extract hostname from URL."""
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return "unknown"


def is_productive_site(url: str) -> Optional[bool]:
    """
    Classify URL as productive (True), unproductive (False), or neutral (None).
    
    Args:
        url: The URL to classify
        
    Returns:
        True if productive, False if unproductive, None if neutral
    """
    host = get_host(url)
    
    # Check whitelist first (productive sites)
    for site in PRODUCTIVE_SITES:
        if site in host:
            return True
    
    # Check blacklist (unproductive sites)
    for site in UNPRODUCTIVE_SITES:
        if site in host:
            return False
    
    # Neither productive nor unproductive - treat as neutral
    return None


def load_data() -> Dict[str, Any]:
    """Load activity data from JSON file with thread safety."""
    with file_lock:
        if not os.path.exists(DATA_FILE):
            return {}
        
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}


def save_data(data: Dict[str, Any]) -> None:
    """Save activity data to JSON file with thread safety."""
    with file_lock:
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving data: {e}")


def get_user_day_data(data: Dict[str, Any], date: str, user: str) -> Dict[str, Any]:
    """Get or create user data for a specific date."""
    if date not in data:
        data[date] = {}
    
    if user not in data[date]:
        data[date][user] = {
            "productive": 0,
            "unproductive": 0,
            "sites": {}
        }
    
    return data[date][user]


@app.get("/")
async def root():
    """Root endpoint with basic info."""
    return {
        "message": "FocusMate API is running!",
        "version": "1.0.0",
        "endpoints": ["/health", "/activity", "/analysis/today"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"ok": True}


@app.post("/activity")
async def log_activity(
    url: str = Query(..., description="The URL being visited"),
    duration: int = Query(..., description="Duration in seconds"),
    user: str = Query("guest", description="Username")
):
    """
    Log user activity for a specific URL and duration.
    
    Args:
        url: The URL being visited
        duration: Time spent on the URL in seconds
        user: Username (default: "guest")
        
    Returns:
        Status and productivity classification
    """
    try:
        # Load existing data
        data = load_data()
        today = today_str()
        
        # Get user data for today
        user_data = get_user_day_data(data, today, user)
        
        # Classify the URL
        productive = is_productive_site(url)
        host = get_host(url)
        
        # Update totals based on classification
        if productive is True:
            user_data["productive"] += duration
        elif productive is False:
            user_data["unproductive"] += duration
        # If productive is None (neutral), we don't count it in either category
        
        # Update per-site tracking (regardless of classification)
        if host not in user_data["sites"]:
            user_data["sites"][host] = 0
        user_data["sites"][host] += duration
        
        # Save updated data
        save_data(data)
        
        return {
            "status": "ok",
            "productive": productive,
            "host": host,
            "duration_logged": duration
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "productive": None
        }


@app.get("/analysis/today")
async def get_today_analysis(user: str = Query("guest", description="Username")):
    """
    Get productivity analysis for today.
    
    Args:
        user: Username (default: "guest")
        
    Returns:
        Detailed productivity analysis with comparison to yesterday
    """
    try:
        data = load_data()
        today = today_str()
        yesterday = yesterday_str()
        
        # Get today's data
        today_data = get_user_day_data(data, today, user)
        productive_seconds = today_data["productive"]
        unproductive_seconds = today_data["unproductive"]
        
        # Convert to minutes
        productive_minutes = productive_seconds // 60
        unproductive_minutes = unproductive_seconds // 60
        total_minutes = productive_minutes + unproductive_minutes
        
        # Calculate productivity percentage
        if total_minutes > 0:
            productivity_percent = round((productive_minutes / total_minutes) * 100, 1)
        else:
            productivity_percent = 0.0
        
        # Compare with yesterday
        delta_vs_yesterday_percent = None
        if yesterday in data and user in data[yesterday]:
            yesterday_data = data[yesterday][user]
            yesterday_productive = yesterday_data["productive"] // 60
            yesterday_unproductive = yesterday_data["unproductive"] // 60
            yesterday_total = yesterday_productive + yesterday_unproductive
            
            if yesterday_total > 0:
                yesterday_percent = (yesterday_productive / yesterday_total) * 100
                delta_vs_yesterday_percent = round(productivity_percent - yesterday_percent, 1)
        
        # Prepare site breakdown (top sites by time)
        site_breakdown = []
        for host, seconds in today_data["sites"].items():
            minutes = seconds // 60
            if minutes > 0:  # Only include sites with at least 1 minute
                site_breakdown.append({
                    "host": host,
                    "minutes": minutes
                })
        
        # Sort by minutes descending
        site_breakdown.sort(key=lambda x: x["minutes"], reverse=True)
        
        # Get random motivational quote
        quote = random.choice(MOTIVATIONAL_QUOTES)
        
        return {
            "productive_minutes": productive_minutes,
            "unproductive_minutes": unproductive_minutes,
            "productivity_percent": productivity_percent,
            "delta_vs_yesterday_percent": delta_vs_yesterday_percent,
            "quote": quote,
            "by_site": site_breakdown[:10]  # Top 10 sites
        }
        
    except Exception as e:
        return {
            "productive_minutes": 0,
            "unproductive_minutes": 0,
            "productivity_percent": 0.0,
            "delta_vs_yesterday_percent": None,
            "quote": "Every journey begins with a single step.",
            "by_site": [],
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    print("Starting FocusMate API server...")
    print("Run with: uvicorn main:app --reload --port 8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
