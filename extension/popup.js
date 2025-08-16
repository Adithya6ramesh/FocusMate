/**
 * FocusMate Popup Script
 * Handles UI interactions and communication with background service worker
 */

// DOM Elements
const elements = {
    username: document.getElementById('username'),
    preset: document.getElementById('preset'),
    timer: document.getElementById('timer'),
    status: document.getElementById('status'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    finishBtn: document.getElementById('finishBtn'),
    loopPomodoro: document.getElementById('loopPomodoro'),
    logInterval: document.getElementById('logInterval'),
    analysisSection: document.getElementById('analysisSection'),
    productiveTime: document.getElementById('productiveTime'),
    productivityPercent: document.getElementById('productivityPercent'),
    deltaPercent: document.getElementById('deltaPercent'),
    motivationalQuote: document.getElementById('motivationalQuote'),
    sitesList: document.getElementById('sitesList')
};

// State
let currentState = {
    mode: 'idle',
    timeLeft: 25 * 60,
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    isPaused: false
};

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadSavedSettings();
    await requestStateUpdate();
    setupEventListeners();
    
    // Set up periodic state updates
    setInterval(requestStateUpdate, 1000);
});

/**
 * Load saved user settings from storage
 */
async function loadSavedSettings() {
    try {
        const result = await chrome.storage.local.get(['username', 'loopPomodoro', 'logInterval']);
        
        if (result.username) {
            elements.username.value = result.username;
        }
        
        if (result.loopPomodoro !== undefined) {
            elements.loopPomodoro.checked = result.loopPomodoro;
        }
        
        if (result.logInterval) {
            elements.logInterval.value = result.logInterval;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save user settings to storage
 */
async function saveSettings() {
    try {
        await chrome.storage.local.set({
            username: elements.username.value,
            loopPomodoro: elements.loopPomodoro.checked,
            logInterval: parseInt(elements.logInterval.value)
        });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Button event listeners
    elements.startBtn.addEventListener('click', handleStart);
    elements.pauseBtn.addEventListener('click', handlePause);
    elements.resetBtn.addEventListener('click', handleReset);
    elements.finishBtn.addEventListener('click', handleFinish);
    
    // Settings change listeners
    elements.username.addEventListener('change', saveSettings);
    elements.loopPomodoro.addEventListener('change', saveSettings);
    elements.logInterval.addEventListener('change', saveSettings);
    
    // Preset change listener
    elements.preset.addEventListener('change', handlePresetChange);
}

/**
 * Handle preset selection change
 */
function handlePresetChange() {
    const [work, breakTime] = elements.preset.value.split(',').map(Number);
    
    // Only update if timer is idle
    if (currentState.mode === 'idle') {
        currentState.workDuration = work * 60;
        currentState.breakDuration = breakTime * 60;
        currentState.timeLeft = work * 60;
        updateTimerDisplay();
    }
}

/**
 * Handle start button click
 */
async function handleStart() {
    const [work, breakTime] = elements.preset.value.split(',').map(Number);
    
    await sendMessageToBackground({
        action: 'START_TIMER',
        payload: {
            workDuration: work * 60,
            breakDuration: breakTime * 60,
            username: elements.username.value || 'guest',
            logInterval: parseInt(elements.logInterval.value),
            loopPomodoro: elements.loopPomodoro.checked
        }
    });
    
    await saveSettings();
}

/**
 * Handle pause/resume button click
 */
async function handlePause() {
    await sendMessageToBackground({
        action: currentState.isPaused ? 'RESUME_TIMER' : 'PAUSE_TIMER'
    });
}

/**
 * Handle reset button click
 */
async function handleReset() {
    await sendMessageToBackground({
        action: 'RESET_TIMER'
    });
    
    // Hide analysis section when resetting
    elements.analysisSection.classList.add('hidden');
}

/**
 * Handle finish button click
 */
async function handleFinish() {
    try {
        // Stop the timer first
        await sendMessageToBackground({
            action: 'STOP_TIMER'
        });
        
        // Fetch today's analysis
        const username = elements.username.value || 'guest';
        const response = await fetch(`http://127.0.0.1:8000/analysis/today?user=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const analysis = await response.json();
        displayAnalysis(analysis);
        
    } catch (error) {
        console.error('Error fetching analysis:', error);
        showErrorMessage('Failed to fetch analysis. Make sure the backend is running.');
    }
}

/**
 * Display analysis results in the UI
 */
function displayAnalysis(analysis) {
    // Update stats
    elements.productiveTime.textContent = `${analysis.productive_minutes} min`;
    elements.productivityPercent.textContent = `${analysis.productivity_percent}%`;
    
    // Update delta vs yesterday
    if (analysis.delta_vs_yesterday_percent !== null) {
        const delta = analysis.delta_vs_yesterday_percent;
        const sign = delta >= 0 ? '+' : '';
        elements.deltaPercent.textContent = `${sign}${delta}%`;
        elements.deltaPercent.style.color = delta >= 0 ? '#27ae60' : '#e74c3c';
    } else {
        elements.deltaPercent.textContent = 'No baseline';
        elements.deltaPercent.style.color = '#7f8c8d';
    }
    
    // Update quote
    elements.motivationalQuote.textContent = analysis.quote;
    
    // Update sites list
    elements.sitesList.innerHTML = '';
    if (analysis.by_site && analysis.by_site.length > 0) {
        analysis.by_site.forEach(site => {
            const siteItem = document.createElement('div');
            siteItem.className = 'site-item';
            siteItem.innerHTML = `
                <span class="site-name">${site.host}</span>
                <span class="site-time">${site.minutes} min</span>
            `;
            elements.sitesList.appendChild(siteItem);
        });
    } else {
        elements.sitesList.innerHTML = '<div class="site-item"><span class="site-name">No activity recorded</span></div>';
    }
    
    // Show analysis section
    elements.analysisSection.classList.remove('hidden');
}

/**
 * Send message to background script
 */
async function sendMessageToBackground(message) {
    try {
        const response = await chrome.runtime.sendMessage(message);
        return response;
    } catch (error) {
        console.error('Error sending message to background:', error);
        return null;
    }
}

/**
 * Request state update from background script
 */
async function requestStateUpdate() {
    try {
        const response = await sendMessageToBackground({ action: 'GET_STATE' });
        if (response) {
            updateUI(response);
        }
    } catch (error) {
        console.error('Error requesting state update:', error);
    }
}

/**
 * Update UI based on current state from background
 */
function updateUI(state) {
    currentState = { ...currentState, ...state };
    
    updateTimerDisplay();
    updateStatusText();
    updateButtons();
    updateTimerAnimation();
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const minutes = Math.floor(currentState.timeLeft / 60);
    const seconds = currentState.timeLeft % 60;
    elements.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Update status text and styling
 */
function updateStatusText() {
    const statusElement = elements.status;
    
    // Remove all status classes
    statusElement.classList.remove('work', 'break', 'paused');
    
    switch (currentState.mode) {
        case 'idle':
            statusElement.textContent = 'Ready to Start';
            break;
        case 'work':
            if (currentState.isPaused) {
                statusElement.textContent = 'Work - Paused';
                statusElement.classList.add('paused');
            } else {
                statusElement.textContent = 'Work Time - Stay Focused!';
                statusElement.classList.add('work');
            }
            break;
        case 'break':
            if (currentState.isPaused) {
                statusElement.textContent = 'Break - Paused';
                statusElement.classList.add('paused');
            } else {
                statusElement.textContent = 'Break Time - Relax!';
                statusElement.classList.add('break');
            }
            break;
        default:
            statusElement.textContent = 'Unknown Status';
    }
}

/**
 * Update button states
 */
function updateButtons() {
    const isIdle = currentState.mode === 'idle';
    const isRunning = currentState.mode !== 'idle' && !currentState.isPaused;
    const isPaused = currentState.isPaused;
    
    // Start button
    elements.startBtn.disabled = !isIdle;
    
    // Pause button
    elements.pauseBtn.disabled = isIdle;
    elements.pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    
    // Reset button
    elements.resetBtn.disabled = isIdle;
    
    // Finish button
    elements.finishBtn.disabled = isIdle;
}

/**
 * Update timer animation
 */
function updateTimerAnimation() {
    const timerSection = document.querySelector('.timer-section');
    
    if (currentState.mode !== 'idle' && !currentState.isPaused) {
        timerSection.classList.add('timer-active');
    } else {
        timerSection.classList.remove('timer-active');
    }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
    // Create a simple notification div
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #e74c3c;
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
        }
    }, 5000);
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'STATE_UPDATE') {
        updateUI(message.state);
    }
    sendResponse({ received: true });
});
