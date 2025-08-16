/**
 * FocusMate Background Service Worker
 * Handles timer state, URL logging, and communication with popup
 */

// Timer state
let timerState = {
    mode: 'idle', // 'idle', 'work', 'break'
    timeLeft: 25 * 60, // seconds
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    isPaused: false,
    username: 'guest',
    logInterval: 30, // seconds
    loopPomodoro: true,
    lastLogTime: 0,
    intervalId: null,
    currentCycle: 0 // Track cycles for auto-loop
};

// Backend URL
const BACKEND_URL = 'http://127.0.0.1:8000';

/**
 * Initialize service worker
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log('FocusMate extension installed');
    loadStateFromStorage();
});

/**
 * Handle startup
 */
chrome.runtime.onStartup.addListener(() => {
    console.log('FocusMate extension started');
    loadStateFromStorage();
});

/**
 * Load timer state from storage
 */
async function loadStateFromStorage() {
    try {
        const result = await chrome.storage.local.get(['timerState']);
        if (result.timerState) {
            // Restore state but reset running timers (don't persist active timers across browser restarts)
            timerState = {
                ...timerState,
                ...result.timerState,
                mode: 'idle',
                isPaused: false,
                intervalId: null
            };
        }
    } catch (error) {
        console.error('Error loading state from storage:', error);
    }
}

/**
 * Save timer state to storage
 */
async function saveStateToStorage() {
    try {
        await chrome.storage.local.set({
            timerState: {
                ...timerState,
                intervalId: null // Don't save interval ID
            }
        });
    } catch (error) {
        console.error('Error saving state to storage:', error);
    }
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.action) {
        case 'START_TIMER':
            startTimer(message.payload);
            break;
        case 'PAUSE_TIMER':
            pauseTimer();
            break;
        case 'RESUME_TIMER':
            resumeTimer();
            break;
        case 'RESET_TIMER':
            resetTimer();
            break;
        case 'STOP_TIMER':
            stopTimer();
            break;
        case 'GET_STATE':
            sendResponse(getPublicState());
            return;
        default:
            console.warn('Unknown action:', message.action);
    }
    
    // Send updated state to popup
    sendStateToPopup();
    sendResponse({ success: true });
});

/**
 * Start the timer with given configuration
 */
function startTimer(config) {
    console.log('Starting timer with config:', config);
    
    // Update state
    timerState.workDuration = config.workDuration;
    timerState.breakDuration = config.breakDuration;
    timerState.timeLeft = config.workDuration;
    timerState.username = config.username || 'guest';
    timerState.logInterval = config.logInterval || 30;
    timerState.loopPomodoro = config.loopPomodoro !== false;
    timerState.mode = 'work';
    timerState.isPaused = false;
    timerState.lastLogTime = Date.now();
    timerState.currentCycle = 0;
    
    // Start the interval
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
    }
    
    timerState.intervalId = setInterval(tick, 1000);
    
    saveStateToStorage();
}

/**
 * Pause the timer
 */
function pauseTimer() {
    console.log('Pausing timer');
    timerState.isPaused = true;
    saveStateToStorage();
}

/**
 * Resume the timer
 */
function resumeTimer() {
    console.log('Resuming timer');
    timerState.isPaused = false;
    timerState.lastLogTime = Date.now(); // Reset log time to avoid immediate logging
    saveStateToStorage();
}

/**
 * Reset the timer
 */
function resetTimer() {
    console.log('Resetting timer');
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    timerState.mode = 'idle';
    timerState.timeLeft = timerState.workDuration;
    timerState.isPaused = false;
    timerState.currentCycle = 0;
    
    saveStateToStorage();
}

/**
 * Stop the timer (similar to reset but called when finishing)
 */
function stopTimer() {
    console.log('Stopping timer');
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    timerState.mode = 'idle';
    timerState.isPaused = false;
    
    saveStateToStorage();
}

/**
 * Timer tick function - called every second
 */
function tick() {
    if (timerState.isPaused) {
        return;
    }
    
    // Decrement time
    timerState.timeLeft--;
    
    // Handle URL logging during work time
    if (timerState.mode === 'work') {
        const now = Date.now();
        const timeSinceLastLog = (now - timerState.lastLogTime) / 1000;
        
        if (timeSinceLastLog >= timerState.logInterval) {
            logActiveTab();
            timerState.lastLogTime = now;
        }
    }
    
    // Handle timer completion
    if (timerState.timeLeft <= 0) {
        handleTimerComplete();
    }
    
    // Send state update to popup
    sendStateToPopup();
    
    // Save state periodically
    if (timerState.timeLeft % 30 === 0) {
        saveStateToStorage();
    }
}

/**
 * Handle timer completion (work or break finished)
 */
function handleTimerComplete() {
    console.log(`${timerState.mode} period completed`);
    
    if (timerState.mode === 'work') {
        // Work period finished, start break
        timerState.mode = 'break';
        timerState.timeLeft = timerState.breakDuration;
        timerState.currentCycle++;
        
        // Show notification
        showNotification('Work period completed!', 'Time for a break. You earned it! 🎉');
        
    } else if (timerState.mode === 'break') {
        // Break period finished
        timerState.currentCycle++;
        
        if (timerState.loopPomodoro) {
            // Start next work period
            timerState.mode = 'work';
            timerState.timeLeft = timerState.workDuration;
            timerState.lastLogTime = Date.now();
            
            showNotification('Break finished!', 'Ready for another focus session? 💪');
        } else {
            // Stop the timer
            stopTimer();
            showNotification('Pomodoro cycle completed!', 'Great work! Check your productivity stats. 📊');
        }
    }
    
    saveStateToStorage();
}

/**
 * Log the currently active tab URL
 */
async function logActiveTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        
        if (!tab || !tab.url) {
            console.log('No active tab or URL found');
            return;
        }
        
        // Skip chrome:// and extension:// URLs
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            console.log('Skipping chrome internal URL:', tab.url);
            return;
        }
        
        console.log('Logging URL:', tab.url);
        
        // Send to backend
        const url = `${BACKEND_URL}/activity?url=${encodeURIComponent(tab.url)}&duration=${timerState.logInterval}&user=${encodeURIComponent(timerState.username)}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Activity logged:', result);
            
        } catch (fetchError) {
            console.error('Error sending activity to backend:', fetchError);
            // Don't break the timer if backend is unavailable
        }
        
    } catch (error) {
        console.error('Error logging active tab:', error);
    }
}

/**
 * Show notification to user
 */
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
    }, (notificationId) => {
        // Auto-clear notification after 5 seconds
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
        }, 5000);
    });
}

/**
 * Send current state to popup
 */
function sendStateToPopup() {
    chrome.runtime.sendMessage({
        action: 'STATE_UPDATE',
        state: getPublicState()
    }).catch(() => {
        // Popup might not be open, ignore error
    });
}

/**
 * Get public state (safe to send to popup)
 */
function getPublicState() {
    return {
        mode: timerState.mode,
        timeLeft: timerState.timeLeft,
        workDuration: timerState.workDuration,
        breakDuration: timerState.breakDuration,
        isPaused: timerState.isPaused,
        username: timerState.username,
        logInterval: timerState.logInterval,
        loopPomodoro: timerState.loopPomodoro,
        currentCycle: timerState.currentCycle
    };
}

/**
 * Handle extension unload
 */
chrome.runtime.onSuspend.addListener(() => {
    console.log('Extension suspending, saving state');
    saveStateToStorage();
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
    }
});

// Initialize on load
loadStateFromStorage();
