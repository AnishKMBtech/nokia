// src/app.js
import * as dom from './dom.js';
import { state, resetStateForContinuousModeStart, stopContinuousModeState } from './state.js';
import { POLLING_DELAY } from './config.js';
import { fetchScrewData } from './api.js';
import { createMarkers, resetDashboard, updateLoadingState, updateStatusIndicators } from './ui.js';
import { generateReport } from './report.js';
import { addSimpleCycleNavigation, removeCycleNavigation } from './cycleNav.js';

// --- Main Application Logic ---

function toggleMonitoring() {
    if (state.isLoading) return; // Prevent action while loading

    if (state.isContinuousMode) {
        stopContinuousMode();
    } else {
        startContinuousMode();
    }
}

function startContinuousMode() {
    if (state.isContinuousMode) return; // Already running

    console.log('Starting data monitoring...');
    resetStateForContinuousModeStart(); // Reset state flags for continuous mode
    resetDashboard(); // Reset UI to initial state
    updateLoadingState(true); // Show loading initially

    // Update button state immediately
    dom.startBtn.textContent = 'STOP';
    dom.startBtn.classList.remove('start');
    dom.startBtn.classList.add('stop');
    updateStatusIndicators(); // Update status indicators

    // Initial data fetch, then start polling
    fetchScrewData().then(success => {
        updateLoadingState(false); // Hide loading after first fetch attempt
        if (success && !state.pollingInterval) { // Start polling only if fetch was ok and not already polling
            state.pollingInterval = setInterval(fetchScrewData, POLLING_DELAY);
            addSimpleCycleNavigation(); // Add nav after first successful fetch
        } else if (!success) {
            // Handle initial fetch failure (e.g., revert button state)
            stopContinuousMode(); // Revert state if initial fetch failed
             dom.startBtn.textContent = 'START';
             dom.startBtn.classList.add('start');
             dom.startBtn.classList.remove('stop');
             updateStatusIndicators();
        }
    }).catch(() => {
         updateLoadingState(false); // Ensure loading is hidden on error too
         stopContinuousMode(); // Revert state on error
         dom.startBtn.textContent = 'START';
         dom.startBtn.classList.add('start');
         dom.startBtn.classList.remove('stop');
         updateStatusIndicators();
    });
}

function stopContinuousMode() {
    if (!state.isContinuousMode) return; // Already stopped

    console.log('Stopping data monitoring...');
    stopContinuousModeState(); // Clear interval and update state flag

    // Update button state
    dom.startBtn.textContent = 'START';
    dom.startBtn.classList.add('start');
    dom.startBtn.classList.remove('stop');

    removeCycleNavigation(); // Remove cycle navigation
    updateStatusIndicators(); // Update status indicators
    // Optionally reset the dashboard or leave the last state visible
    // resetDashboard(); // Uncomment to clear the view on stop
}


// --- Event Listeners ---
function setupEventListeners() {
    dom.startBtn.addEventListener('click', toggleMonitoring);
    dom.generateReportBtn.addEventListener('click', generateReport);

    // Example listener for other action buttons (if needed)
    document.querySelectorAll('.btn-action:not(#generateReportBtn)').forEach(button => {
        button.addEventListener('click', (event) => {
            console.log(`${event.target.textContent} button clicked`);
            // Add specific actions for ANGLE/TORQUE PATTERN buttons if required
        });
    });
}

// --- Initialization ---
function initializeApp() {
    console.log('Initializing Smart Screw Driver System UI...');
    createMarkers(); // Create the screw markers on the image
    resetDashboard(); // Set the initial state of the dashboard
    setupEventListeners(); // Attach event listeners to buttons

    // Set initial button state correctly
    dom.startBtn.textContent = 'START';
    dom.startBtn.classList.add('start');
    dom.startBtn.classList.remove('stop');
    updateStatusIndicators(); // Set initial status indicators

    console.log('Application Initialized.');
}

// --- Run Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', initializeApp);
