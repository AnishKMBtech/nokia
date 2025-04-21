// src/state.js
import { totalScrews } from './config.js';

export const state = {
    currentScrewIndex: 0,
    simulationTimeout: null,
    isRunning: false,
    isLoading: false,
    simulationStartTime: null,
    simulationEndTime: null,
    finalScrewData: [],
    screwDataSet: [], // Initialize as empty, will be fetched
    allScrewData: [], // Store all historical data
    currentCycle: 0, // Track which cycle we're viewing (0 = latest)
    totalCycles: 0, // Total number of cycles available
    pollingInterval: null, // For continuous data fetching
    isContinuousMode: false, // Flag for continuous mode
    userSelectedPreviousCycle: false, // Track if user selected a previous cycle
    generatedCycleReports: new Set(), // Track generated reports
    lastCycleScreenshotDataUrl: null, // Store the data URL of the last completed cycle's screenshot
    latestCycleScreenshotTaken: false, // Flag to check if screenshot for the latest cycle is done
};

export function resetStateForCycleProcessing() {
    state.currentScrewIndex = 0;
    state.simulationStartTime = null;
    state.simulationEndTime = null;
    state.finalScrewData = [];
}

export function resetStateForContinuousModeStart() {
    state.isContinuousMode = true;
    state.userSelectedPreviousCycle = false;
    state.currentCycle = 0; // Start with the latest cycle
    state.totalCycles = 0;
    state.allScrewData = [];
    state.screwDataSet = [];
    state.lastCycleScreenshotDataUrl = null; // Reset screenshot URL
    state.latestCycleScreenshotTaken = false; // Reset screenshot flag
    resetStateForCycleProcessing(); // Reset cycle-specific state too
}

export function stopContinuousModeState() {
    state.isContinuousMode = false;
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
        state.pollingInterval = null;
    }
}

export function groupDataIntoCycles(data) {
    const cycles = [];
    for (let i = 0; i < data.length; i += totalScrews) {
        cycles.push(data.slice(i, i + totalScrews));
    }
    return cycles;
}

export function updateCycles(newData) {
    const dataChanged = newData.length !== state.allScrewData.length;
    const previousTotalCycles = state.totalCycles;
    const previousCyclePosition = state.currentCycle;

    state.allScrewData = newData;
    const cycles = groupDataIntoCycles(newData);
    state.totalCycles = cycles.length;

    if (state.isContinuousMode && dataChanged && !state.userSelectedPreviousCycle) {
        state.currentCycle = 0; // Auto-switch to latest if not manually viewing history
    } else if (state.userSelectedPreviousCycle && dataChanged) {
        // Maintain relative position from the end if viewing history
        state.currentCycle = Math.min(previousCyclePosition, state.totalCycles - 1);
    } else if (!state.isContinuousMode) {
         // Default to latest cycle when not in continuous mode or no change
         state.currentCycle = 0;
    }

    return { cycles, dataChanged };
}

export function getSelectedCycleData() {
    const cycles = groupDataIntoCycles(state.allScrewData);
    const selectedCycleIndex = Math.max(0, cycles.length - 1 - state.currentCycle);
    const cycleScrews = cycles[selectedCycleIndex] || [];

    state.screwDataSet = cycleScrews.map((screw, index) => ({
        ...screw,
        displayId: index + 1,
        originalId: screw.id,
        cycleIndex: selectedCycleIndex
    }));

    return state.screwDataSet;
}
