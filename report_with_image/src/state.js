export let currentScrewIndex = 0;
export let simulationTimeout = null; // Use setTimeout for sequencing
export let isLoading = false; // New flag to track loading state
export let simulationStartTime = null;
export let simulationEndTime = null;
export let finalScrewData = [];
export let screwDataSet = []; // Initialize as empty, will be fetched
export let allScrewtData = []; // Store all historical data
export let currentCycle = 0; // Track which cycle we're viewing (0 = latest)
export let totalCycles = 0; // Total number of cycles available
export let pollingInterval = null; // For continuous data fetching

// Function to update state variables (optional, but good practice)
export function setState(newState) {
    if (newState.currentScrewIndex !== undefined) currentScrewIndex = newState.currentScrewIndex;
    if (newState.simulationTimeout !== undefined) simulationTimeout = newState.simulationTimeout;
    if (newState.isLoading !== undefined) isLoading = newState.isLoading;
    if (newState.simulationStartTime !== undefined) simulationStartTime = newState.simulationStartTime;
    if (newState.simulationEndTime !== undefined) simulationEndTime = newState.simulationEndTime;
    if (newState.finalScrewData !== undefined) finalScrewData = newState.finalScrewData;
    if (newState.screwDataSet !== undefined) screwDataSet = newState.screwDataSet;
    if (newState.allScrewtData !== undefined) allScrewtData = newState.allScrewtData;
    if (newState.currentCycle !== undefined) currentCycle = newState.currentCycle;
    if (newState.totalCycles !== undefined) totalCycles = newState.totalCycles;
    if (newState.pollingInterval !== undefined) pollingInterval = newState.pollingInterval;
}
