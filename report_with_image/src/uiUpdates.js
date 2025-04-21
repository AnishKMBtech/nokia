import * as config from './config.js';
import * as dom from './domElements.js';
import * as state from './state.js';

// Simplified loading state function
export function updateLoadingState(isLoading) {
    // Determine monitoring status based on pollingInterval
    const monitoringActive = state.pollingInterval !== null;

    // Update button and cursor
    dom.startStopBtn.textContent = isLoading ? 'LOADING...' : (monitoringActive ? 'STOP' : 'START');
    dom.startStopBtn.disabled = isLoading;
    document.body.style.cursor = isLoading ? 'wait' : 'default';

    // Update button classes based on monitoring state when not loading
    if (!isLoading) {
        if (monitoringActive) {
            dom.startStopBtn.classList.remove('start');
            dom.startStopBtn.classList.add('stop');
        } else {
            dom.startStopBtn.classList.remove('stop');
            dom.startStopBtn.classList.add('start');
        }
    }

    // Simple loading indicator in status
    if (isLoading) {
        dom.screwDriverStatusDiv.classList.add('loading');
        dom.plcmStatusDiv.classList.add('loading');
    } else {
        // Update status based on monitoring state
        if (monitoringActive) {
            dom.screwDriverStatusDiv.classList.add('active');
            dom.plcmStatusDiv.classList.add('active');
        } else {
            dom.screwDriverStatusDiv.classList.remove('active', 'loading');
            dom.plcmStatusDiv.classList.remove('active', 'loading', 'history-mode');
        }
    }
}

// Function to update monitoring status display (used by workflow)
export function updateMonitoringStatus(monitoringActive) {
    // Update button text and class
    dom.startStopBtn.textContent = monitoringActive ? 'STOP' : 'START';
    if (monitoringActive) {
        dom.startStopBtn.classList.remove('start');
        dom.startStopBtn.classList.add('stop');
        dom.screwDriverStatusDiv.classList.add('active');
        dom.plcmStatusDiv.classList.add('active');
    } else {
        dom.startStopBtn.classList.remove('stop');
        dom.startStopBtn.classList.add('start');
        dom.screwDriverStatusDiv.classList.remove('active');
        dom.plcmStatusDiv.classList.remove('active');
    }
    // Ensure loading state visuals are removed when explicitly setting status
    dom.screwDriverStatusDiv.classList.remove('loading');
    dom.plcmStatusDiv.classList.remove('loading');
    dom.startStopBtn.disabled = false;
    document.body.style.cursor = 'default';
}

// Optimize cycle display updates (only shows latest cycle)
export function updateCycleDisplay() {
    // Calculate the cycle index (0 = latest cycle)
    const cycleIndex = 0; // Always show latest

    // Group all data into cycles of 19 screws
    const cycles = [];
    for (let i = 0; i < state.allScrewtData.length; i += config.totalScrews) {
        cycles.push(state.allScrewtData.slice(i, i + config.totalScrews));
    }

    // Get the selected cycle (latest)
    const selectedCycleIndex = Math.max(0, cycles.length - 1 - cycleIndex);
    const cycleScrews = cycles[selectedCycleIndex] || [];

    // Map the screws to IDs 1-19 for display purposes
    const newScrewDataSet = cycleScrews.map((screw, index) => {
        return {
            ...screw,
            displayId: index + 1,
            originalId: screw.id,
            cycleIndex: selectedCycleIndex // Add cycle index to identify which cycle this belongs to
        };
    });
    state.setState({ screwDataSet: newScrewDataSet });

    // Clear all markers first
    clearAllMarkerStates(true);

    // Apply marker updates on the next animation frame
    requestAnimationFrame(() => {
        updateUIWithMappedData(state.screwDataSet);
    });

    // Removed call to updateImageOverlayInfo
}

// Enhanced marker update with optimized transitions
export function updateMarkersWithoutFlicker(screws) {
    // Map screws by ID for quick lookups
    const screwMap = {};
    screws.forEach(screw => {
        screwMap[screw.displayId] = screw;
    });

    // Get all markers once to avoid repeated DOM queries
    const markers = document.querySelectorAll('.screw-marker');

    // Batch updates using requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
        markers.forEach(marker => {
            const id = parseInt(marker.id.replace('screw-marker-', ''));
            const screw = screwMap[id];

            // Skip if no data for this screw in current cycle
            if (!screw) {
                marker.style.opacity = '0.3';
                marker.classList.remove('success', 'fail', 'processing');
                return;
            }

            // Ensure full opacity
            marker.style.opacity = '1';

            // Determine pass/fail status
            const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
            const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
            const newStatus = isAngleOk && isTorqueOk ? 'success' : 'fail';

            // Only update class if status changed (prevents unnecessary reflows)
            // Check against initial state as well
            if (!marker.classList.contains(newStatus) && !marker.classList.contains('processing')) {
                // Remove all status classes first (including initial)
                marker.classList.remove('initial', 'success', 'fail', 'processing');

                // Add new status class
                marker.classList.add(newStatus);
            }
        });
    });
}

// Optimized clear markers function to prevent flickering
export function clearAllMarkerStates(clearAll = false) {
    // Batch operation for better performance
    const markers = document.querySelectorAll('.screw-marker');

    // Use requestAnimationFrame for smoother visual updates
    requestAnimationFrame(() => {
        markers.forEach(marker => {
            marker.classList.remove('processing', 'success', 'fail');
            if (clearAll) {
                // Reset to initial state instead of fading out
                marker.classList.add('initial');
                marker.style.opacity = '1'; // Ensure it's visible
            }
        });
    });
}

// Optimize table updates to prevent flickering
export function updateUIWithMappedData(mappedData) {
    if (!mappedData || mappedData.length === 0) return;

    // First pass - cache existing rows
    const existingRows = {};
    Array.from(dom.screwDataTableBody.querySelectorAll('tr[id^="screw-row-"]')).forEach(row => {
        const id = row.id.replace('screw-row-', '');
        existingRows[id] = row;
    });

    // Remove placeholder row if it exists
    const placeholderRow = dom.screwDataTableBody.querySelector('td[colspan="7"]');
    if (placeholderRow) {
        placeholderRow.closest('tr').remove();
    }

    // Use DocumentFragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    const idsToKeep = [];

    // Prepare all row updates in memory
    mappedData.forEach(screw => {
        const displayId = screw.displayId.toString();
        idsToKeep.push(displayId);

        let row = existingRows[displayId];

        if (!row) {
            // Create new row
            row = document.createElement('tr');
            row.id = `screw-row-${displayId}`;

            // Create all cells at once
            for (let i = 0; i < 7; i++) {
                const cell = document.createElement('td');
                row.appendChild(cell);
            }

            // Set values
            row.cells[0].textContent = displayId;
            row.cells[1].textContent = screw.angleMin;
            row.cells[2].textContent = screw.angleMax;
            row.cells[3].textContent = screw.actualAngle;
            row.cells[4].textContent = screw.torqueMin.toFixed(1);
            row.cells[5].textContent = screw.torqueMax.toFixed(1);
            row.cells[6].textContent = screw.actualTorque.toFixed(1);

            // Add to fragment
            fragment.appendChild(row);
        } else {
            // Only update values that might change
            row.cells[3].textContent = screw.actualAngle;
            row.cells[6].textContent = screw.actualTorque.toFixed(1);
        }

        // Set row status class
        const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
        const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
        const status = isAngleOk && isTorqueOk ? 'highlight-ok' : 'highlight-nok';

        // Only update class if changed
        if (!row.classList.contains(status)) {
            row.className = status;
        }
    });

    // Apply all new rows at once
    if (fragment.childNodes.length > 0) {
        dom.screwDataTableBody.appendChild(fragment);
    }

    // Remove rows that are no longer needed
    Object.keys(existingRows).forEach(id => {
        if (!idsToKeep.includes(id)) {
            existingRows[id].remove();
        }
    });

    // Update markers on next animation frame for better performance
    requestAnimationFrame(() => {
        updateMarkersWithoutFlicker(mappedData);
    });

    // Update current screw details display
    const latestScrew = mappedData[mappedData.length - 1];
    if (latestScrew) {
        updateCurrentScrewDetails(latestScrew);
    }
}

// Create Markers on the image
export function createMarkers() {
    dom.markersOverlay.innerHTML = ''; // Clear existing markers
    config.markerPositions.forEach(pos => {
        const marker = document.createElement('div');
        // Add 'initial' class for default styling
        marker.className = 'screw-marker initial';
        marker.id = `screw-marker-${pos.id}`;
        marker.style.left = pos.left;
        marker.style.top = pos.top;
        marker.textContent = pos.id; // Add screw number text
        dom.markersOverlay.appendChild(marker);
    });
}

// Reset the dashboard to initial state
export function resetDashboard() {
    state.setState({ currentScrewIndex: 0 });
    dom.screwDataTableBody.innerHTML = ''; // Clear table
    updateCurrentScrewDetails(null); // Clear details
    clearAllMarkerStates(true); // Pass true to clear all states and reset to initial
    // Removed status div class removals, handled by updateMonitoringStatus/updateLoadingState
    state.setState({ simulationStartTime: null, simulationEndTime: null, finalScrewData: [] }); // Reset times and report data

    // Add clear message to table when resetting
    if (dom.screwDataTableBody) {
        const emptyRow = dom.screwDataTableBody.insertRow();
        const cell = emptyRow.insertCell(0);
        cell.colSpan = 7;
        // Updated message
        cell.textContent = 'Press START to begin monitoring...';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        cell.style.color = '#666';
    }
}

// Update the display for the current screw's details
export function updateCurrentScrewDetails(screw) {
    if (screw) {
        // Directly update present values without animation
        dom.presentScrewIdInput.value = screw.displayId || screw.id;
        dom.presentAngleInput.value = screw.actualAngle;
        dom.presentTorqueInput.value = screw.actualTorque.toFixed(1);
    } else {
        // Clear values
        dom.presentScrewIdInput.value = "";
        dom.presentAngleInput.value = "";
        dom.presentTorqueInput.value = "";
    }
}
