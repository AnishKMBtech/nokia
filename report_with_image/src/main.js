import * as dom from './domElements.js';
import * as ui from './uiUpdates.js';
import * as state from './state.js';
import { initStationData } from './stationData.js';
import { initWorkflow } from './workflow.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing application...");
    // --- Initial Setup ---
    console.log("Creating markers...");
    ui.createMarkers();
    console.log("Resetting dashboard...");
    ui.resetDashboard();
    console.log("Initializing station data...");
    initStationData();
    console.log("Initializing workflow...");
    initWorkflow(); // Initialize workflow (handles start/stop button)

    console.log("Smart Screw Driver System Initialized (simplified).");
});
