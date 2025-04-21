// src/api.js
import { state, updateCycles, getSelectedCycleData } from './state.js';
import { updateLoadingState, updateCycleDisplay, captureCycleScreenshot } from './ui.js'; // Import captureCycleScreenshot
import { addSimpleCycleNavigation } from './cycleNav.js';
import { checkAndGenerateCycleReport } from './report.js';
import { totalScrews } from './config.js'; // Import totalScrews

export async function fetchScrewData() {
    let showLoadingTimerId = null;
    try {
        // Show loading state only if fetching takes longer than 300ms
        showLoadingTimerId = setTimeout(() => {
            state.isLoading = true;
            updateLoadingState(true);
        }, 300);

        const response = await fetch('/api/screws');
        clearTimeout(showLoadingTimerId); // Clear timer once fetch completes

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newData = await response.json();
        newData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Ensure sorting if timestamps are available, otherwise use ID or order from DB

        // Update state with new data and get cycle info
        const { cycles, dataChanged } = updateCycles(newData);

        // --- Screenshot Logic ---
        const latestCycleIndex = cycles.length - 1;
        const latestCycleData = cycles[latestCycleIndex] || [];
        let screenshotTaken = false;

        // Check if the latest cycle is complete and screenshot not yet taken
        if (latestCycleData.length === totalScrews && !state.latestCycleScreenshotTaken) {
            try {
                // Ensure UI is updated *before* taking screenshot
                updateCycleDisplay(); // Update markers to final state
                // Wait a brief moment for UI to render before capturing
                await new Promise(resolve => setTimeout(resolve, 100));

                state.lastCycleScreenshotDataUrl = await captureCycleScreenshot();
                state.latestCycleScreenshotTaken = true;
                screenshotTaken = true;
                console.log('Screenshot captured for completed cycle.');
            } catch (screenshotError) {
                console.error("Failed to capture screenshot for cycle:", screenshotError);
                state.lastCycleScreenshotDataUrl = null; // Ensure it's null on failure
                // Optionally, still mark as taken to prevent retries?
                // state.latestCycleScreenshotTaken = true;
            }
        }

        // Reset screenshot flag if a new cycle starts or data changes and current cycle isn't full
        const isNewCycleStarting = newData.length > 0 && newData.length % totalScrews === 1;
        if (dataChanged && (isNewCycleStarting || latestCycleData.length < totalScrews)) {
             if (state.latestCycleScreenshotTaken) {
                console.log('Resetting screenshot taken flag for new/incomplete cycle.');
                state.latestCycleScreenshotTaken = false;
                // state.lastCycleScreenshotDataUrl = null; // Clear old screenshot when new cycle starts
             }
        }
        // --- End Screenshot Logic ---

        // Add/update cycle navigation if needed (only in continuous mode)
        if (state.isContinuousMode) {
            addSimpleCycleNavigation(); // This function now uses state.totalCycles internally
        }

        // Auto-generate reports for newly completed cycles *after* potential screenshot
        // Pass the flag indicating if a screenshot was just taken for this cycle
        checkAndGenerateCycleReport(cycles, screenshotTaken);

        // Update UI (if not already updated before screenshot)
        if (!screenshotTaken) {
             requestAnimationFrame(() => {
                updateCycleDisplay();
            });
        }

        return true; // Indicate success

    } catch (error) {
        clearTimeout(showLoadingTimerId); // Ensure timer is cleared on error too
        console.error("Failed to fetch screw data:", error);
        if (!state.isContinuousMode) { // Show alert only if not in continuous background polling
            alert("Error fetching screw data from the server.");
        }
        // Optionally update UI to show error state
        return false; // Indicate failure
    } finally {
        // Ensure loading state is always turned off
        if (state.isLoading) {
            state.isLoading = false;
            updateLoadingState(false);
        }
    }
}
