// src/workflow.js
import * as config from './config.js';
import * as state from './state.js';
import * as ui from './uiUpdates.js';
import { fetchScrewData } from './api.js';
import { generateReport } from './report.js';
import * as dom from './domElements.js';

// Removed isMonitoring variable, will rely on state.pollingInterval
const processedCycles = new Set(); // Track processed cycle indices

// --- Email Sending Helper (for PDF reports) ---

async function sendPdfReportEmail(reportDetails) {
    if (!reportDetails || !reportDetails.pdfDataUri) {
        console.error("sendPdfReportEmail: Missing report details or PDF data.");
        return;
    }

    console.log(`Sending PDF report email for Cycle ${reportDetails.cycleNumber}...`);
    try {
        const response = await fetch('/api/send-report-with-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pdfDataUri: reportDetails.pdfDataUri,
                filename: reportDetails.filename,
                status: reportDetails.status,
                cycleNumber: reportDetails.cycleNumber,
                timestamp: reportDetails.timestamp,
            }),
        });

        const result = await response.json();
        if (result.success) {
            console.log(`PDF report email sent successfully for Cycle ${reportDetails.cycleNumber}:`, result.messageId);
        } else {
            console.error(`Failed to send PDF report email for Cycle ${reportDetails.cycleNumber}:`, result.error);
        }
    } catch (error) {
        console.error(`Error sending PDF report email for Cycle ${reportDetails.cycleNumber}:`, error);
    }
}

// --- Core Workflow Functions ---

async function fetchAndProcessData() {
    console.log("fetchAndProcessData called");
    let showLoadingTimerId = null;
    try {
        showLoadingTimerId = setTimeout(() => {
            state.setState({ isLoading: true });
            ui.updateLoadingState(true);
        }, 300);

        const newData = await fetchScrewData();
        clearTimeout(showLoadingTimerId);
        showLoadingTimerId = null;

        if (!newData) {
            console.error("fetchAndProcessData: No data received from API. Skipping processing.");
            if (state.isLoading) {
                state.setState({ isLoading: false });
                ui.updateLoadingState(false);
            }
            return;
        }

        console.log(`fetchAndProcessData: Received ${newData.length} screw records.`);

        newData.sort((a, b) => a.id - b.id);

        const dataChanged = JSON.stringify(newData) !== JSON.stringify(state.allScrewtData);

        if (!dataChanged) {
            console.log("fetchAndProcessData: Data hasn't changed. Skipping UI update.");
            if (state.isLoading) {
                state.setState({ isLoading: false });
                ui.updateLoadingState(false);
            }
            return;
        }

        console.log("fetchAndProcessData: Data has changed. Processing...");

        state.setState({ allScrewtData: newData });

        const cycles = [];
        for (let i = 0; i < newData.length; i += config.totalScrews) {
            cycles.push(newData.slice(i, i + config.totalScrews));
        }
        const newTotalCycles = cycles.length;
        console.log(`fetchAndProcessData: Grouped data into ${newTotalCycles} cycles.`);
        state.setState({ totalCycles: newTotalCycles });

        // --- Cycle Completion & Reporting (Simplified) ---
        await processCompletedCycles(cycles);

        // --- UI Updates (Simplified) ---
        // Always show the latest cycle data
        state.setState({ currentCycle: 0 });
        console.log("fetchAndProcessData: Updating view to latest cycle (index 0).");

        console.log("fetchAndProcessData: Requesting UI update for cycle display.");
        requestAnimationFrame(() => {
            ui.updateCycleDisplay(); // Update table and markers with latest cycle data
        });

    } catch (error) {
        console.error("Error in fetchAndProcessData:", error);
    } finally {
        if (showLoadingTimerId) clearTimeout(showLoadingTimerId);
        if (state.isLoading) {
            state.setState({ isLoading: false });
            ui.updateLoadingState(false);
            console.log("fetchAndProcessData: Final loading state check - turned off.");
        }
    }
}

// Simplified: Generate report and email for *every* completed cycle
async function processCompletedCycles(cycles) {
    for (const [idx, cycleData] of cycles.entries()) {
        // Check if cycle is complete (has 19 screws) and not already processed
        if (cycleData.length === config.totalScrews && !processedCycles.has(idx)) {
            console.log(`Cycle index ${idx} completed. Generating report and sending email...`);

            // Map data for the report
            const reportCycleData = cycleData.map((screw, i) => ({
                ...screw,
                displayId: i + 1,
                originalId: screw.id,
                cycleIndex: idx
            }));

            // Generate report details (always generate)
            const reportDetails = await generateReport(reportCycleData, idx);

            if (reportDetails) {
                // Send the PDF report email (always send)
                await sendPdfReportEmail(reportDetails);
                processedCycles.add(idx); // Mark as processed *after* successful email attempt
                console.log(`Cycle ${reportDetails.cycleNumber} (index ${idx}) processed for reporting.`);
            } else {
                console.error(`Failed to generate report details for cycle index ${idx}. Email not sent.`);
            }
        }
    }
}

export function startMonitoring() {
    // Check if already monitoring
    if (state.pollingInterval) return;

    console.log('Starting data monitoring...');
    // No state update needed here for isRunning/isContinuousMode

    ui.resetDashboard();
    ui.updateMonitoringStatus(true); // Update button/indicators to active

    fetchAndProcessData().then(() => {
        // Check if monitoring wasn't stopped immediately after starting
        if (!state.pollingInterval) { // Check if it's still null
            const intervalId = setInterval(fetchAndProcessData, config.POLLING_DELAY);
            state.setState({ pollingInterval: intervalId }); // Store the interval ID
            console.log(`Polling started with interval ID: ${intervalId}`);
        }
    });
}

export function stopMonitoring() {
    // Check if not monitoring
    if (!state.pollingInterval) return;

    console.log('Stopping data monitoring...');
    // No state update needed here for isRunning/isContinuousMode

    clearInterval(state.pollingInterval);
    console.log(`Polling interval ID ${state.pollingInterval} cleared.`);
    state.setState({ pollingInterval: null }); // Clear the interval ID in state

    ui.updateMonitoringStatus(false); // Update button/indicators to inactive
}

export function initWorkflow() {
    console.log("Initializing workflow...");
    ui.updateMonitoringStatus(false); // Ensure button shows START initially

    // Add event listener for the START/STOP button
    dom.startStopBtn.addEventListener('click', () => {
        // Check state.pollingInterval to decide action
        if (state.pollingInterval) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    });
}
