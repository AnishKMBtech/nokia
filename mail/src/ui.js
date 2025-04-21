// src/ui.js
import * as dom from './dom.js';
import { state, getSelectedCycleData } from './state.js';
import { markerPositions, processingDelay } from './config.js';
import { removeCycleNavigation } from './cycleNav.js';

// --- Loading State ---
export function updateLoadingState(isLoading) {
    dom.startBtn.textContent = isLoading ? 'LOADING...' : (state.isContinuousMode ? 'STOP' : 'START');
    dom.startBtn.disabled = isLoading;
    document.body.style.cursor = isLoading ? 'wait' : 'default';

    if (isLoading) {
        dom.screwDriverStatusDiv.classList.add('loading');
        dom.plcmStatusDiv.classList.add('loading');
    } else {
        dom.screwDriverStatusDiv.classList.remove('loading');
        dom.plcmStatusDiv.classList.remove('loading');
        // Reset status indicators based on actual state if needed, or keep them neutral
        // Example: updateStatusIndicators(); // You might need a function like this
    }
}

// --- Cycle Display ---
export function updateCycleDisplay() {
    const mappedData = getSelectedCycleData(); // Get data for the current cycle view

    clearAllMarkerStates(true); // Clear markers before updating

    requestAnimationFrame(() => {
        updateUIWithMappedData(mappedData); // Update table and markers
        updateImageOverlayInfo(state.currentCycle === 0 ? 'Present Cycle' : 'Previous Cycle');
    });
}


// --- Image Overlay ---
export function updateImageOverlayInfo(cycleLabel) {
    const existingLabel = dom.imageContainer?.querySelector('.cycle-overlay-label');
    if (existingLabel) {
        existingLabel.remove();
    }

    if (dom.imageContainer) {
        const label = document.createElement('div');
        label.className = 'cycle-overlay-label';
        label.textContent = cycleLabel;
        label.classList.add(cycleLabel === 'Present Cycle' ? 'present' : 'previous');
        dom.imageContainer.appendChild(label);
    }
}

// --- Markers ---
export function createMarkers() {
    dom.markersOverlay.innerHTML = ''; // Clear existing markers
    markerPositions.forEach(pos => {
        const marker = document.createElement('div');
        marker.className = 'screw-marker initial'; // Start with initial state
        marker.id = `screw-marker-${pos.id}`;
        marker.style.left = pos.left;
        marker.style.top = pos.top;
        marker.textContent = pos.id;
        dom.markersOverlay.appendChild(marker);
    });
}

export function clearAllMarkerStates(resetToInitial = false) {
    const markers = dom.markersOverlay.querySelectorAll('.screw-marker');
    requestAnimationFrame(() => {
        markers.forEach(marker => {
            marker.classList.remove('processing', 'success', 'fail', 'transition'); // Remove dynamic states
            if (resetToInitial) {
                marker.classList.add('initial'); // Reset to initial visual state
                marker.style.opacity = '1';
            } else {
                 marker.classList.remove('initial'); // Or just remove all if not resetting
                 marker.style.opacity = '0.3'; // Example: fade out if not resetting
            }
        });
    });
}

export function updateMarkersWithoutFlicker(screws) {
    const screwMap = {};
    screws.forEach(screw => {
        screwMap[screw.displayId] = screw;
    });

    const markers = dom.markersOverlay.querySelectorAll('.screw-marker');

    requestAnimationFrame(() => {
        markers.forEach(marker => {
            const id = parseInt(marker.id.replace('screw-marker-', ''));
            const screw = screwMap[id];

            if (!screw) {
                // If screw data doesn't exist for this marker in the current cycle view
                marker.style.opacity = '0.3'; // Dim it
                marker.classList.remove('success', 'fail', 'processing', 'initial'); // Remove status classes
                return;
            }

            marker.style.opacity = '1'; // Ensure visible

            const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
            const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
            const newStatus = isAngleOk && isTorqueOk ? 'success' : 'fail';

            // Update class only if it changed and not currently processing
            if (!marker.classList.contains(newStatus) && !marker.classList.contains('processing')) {
                marker.classList.remove('initial', 'success', 'fail', 'processing'); // Clear previous states
                marker.classList.add(newStatus); // Add the new state
            } else if (marker.classList.contains('initial')) {
                 // If it was initial, remove initial and add new status
                 marker.classList.remove('initial');
                 marker.classList.add(newStatus);
            }
        });
    });
}

// Placeholder simulation for visual feedback (can be removed if not needed)
export function simulateScrewProcessing(screwId) {
    const marker = document.getElementById(`screw-marker-${screwId}`);
    if (marker) {
        marker.classList.remove('initial', 'success', 'fail');
        marker.classList.add('processing');

        setTimeout(() => {
            marker.classList.remove('processing');
            // In a real scenario, updateMarkersWithoutFlicker would set the final state
            // For demo, just remove processing. The next data fetch will update it.
            // marker.classList.add('initial'); // Or let updateMarkers handle it
        }, processingDelay);
    }
}


// --- Table ---
export function updateUIWithMappedData(mappedData) {
    if (!mappedData) return; // Handle case where data might be null/undefined initially

    const existingRows = {};
    Array.from(dom.screwDataTableBody.querySelectorAll('tr[id^="screw-row-"]')).forEach(row => {
        const id = row.id.replace('screw-row-', '');
        existingRows[id] = row;
    });

    const placeholderRow = dom.screwDataTableBody.querySelector('td[colspan="7"]');
    if (placeholderRow) {
        placeholderRow.closest('tr').remove();
    }

    const fragment = document.createDocumentFragment();
    const idsToKeep = new Set(); // Use Set for faster lookups

    if (mappedData.length === 0 && !state.isContinuousMode && !state.isLoading) {
         // Show placeholder only if not loading and not in continuous mode with no data yet
         addPlaceholderRow('No data available for this cycle.');
    } else {
        mappedData.forEach(screw => {
            const displayId = screw.displayId.toString();
            idsToKeep.add(displayId);

            let row = existingRows[displayId];
            const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
            const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
            const statusClass = isAngleOk && isTorqueOk ? 'highlight-ok' : 'highlight-nok';

            if (!row) {
                row = document.createElement('tr');
                row.id = `screw-row-${displayId}`;
                row.innerHTML = `
                    <td>${displayId}</td>
                    <td>${screw.angleMin}</td>
                    <td>${screw.angleMax}</td>
                    <td>${screw.actualAngle}</td>
                    <td>${screw.torqueMin.toFixed(1)}</td>
                    <td>${screw.torqueMax.toFixed(1)}</td>
                    <td>${screw.actualTorque.toFixed(1)}</td>
                `;
                fragment.appendChild(row);
            } else {
                // Only update cells that change: actualAngle and actualTorque
                row.cells[3].textContent = screw.actualAngle;
                row.cells[6].textContent = screw.actualTorque.toFixed(1);
            }

            // Update row status class efficiently
            if (row.className !== statusClass) {
                row.className = statusClass;
            }
        });
    }


    // Batch append new rows
    if (fragment.childNodes.length > 0) {
        dom.screwDataTableBody.appendChild(fragment);
    }

    // Batch remove old rows
    Object.keys(existingRows).forEach(id => {
        if (!idsToKeep.has(id)) {
            existingRows[id].remove();
        }
    });

    // Update markers after table update
    requestAnimationFrame(() => {
         updateMarkersWithoutFlicker(mappedData);
    });


    // Update current screw details display
    const latestScrewInCycle = mappedData.length > 0 ? mappedData[mappedData.length - 1] : null;
    updateCurrentScrewDetails(latestScrewInCycle);
}


function addPlaceholderRow(message) {
    if (dom.screwDataTableBody.querySelector('td[colspan="7"]')) return; // Avoid adding multiple placeholders
    dom.screwDataTableBody.innerHTML = ''; // Clear existing rows first
    const emptyRow = dom.screwDataTableBody.insertRow();
    const cell = emptyRow.insertCell(0);
    cell.colSpan = 7;
    cell.textContent = message;
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.style.color = '#666';
}

// --- Current Screw Details ---
export function updateCurrentScrewDetails(screw) {
    if (screw) {
        dom.presentScrewIdInput.value = screw.displayId || screw.id;
        dom.presentAngleInput.value = screw.actualAngle;
        dom.presentTorqueInput.value = screw.actualTorque.toFixed(1);
    } else {
        dom.presentScrewIdInput.value = "";
        dom.presentAngleInput.value = "";
        dom.presentTorqueInput.value = "";
    }
}

// --- Dashboard Reset ---
export function resetDashboard() {
    dom.screwDataTableBody.innerHTML = ''; // Clear table
    addPlaceholderRow('Press START to fetch and display screw data...'); // Add placeholder
    updateCurrentScrewDetails(null); // Clear details
    clearAllMarkerStates(true); // Reset markers to initial state
    dom.screwDriverStatusDiv.classList.remove('active', 'loading'); // Reset status indicators
    dom.plcmStatusDiv.classList.remove('active', 'loading', 'history-mode');
    updateImageOverlayInfo(''); // Clear cycle label
    removeCycleNavigation(); // Remove cycle nav if present
}

// --- Status Indicators ---
// Example function to update status indicators based on state
export function updateStatusIndicators() {
    // Update Screw Driver Status (Example logic)
    if (state.isContinuousMode) { // Or based on actual connection status if available
        dom.screwDriverStatusDiv.classList.add('active');
        dom.screwDriverStatusDiv.classList.remove('loading');
    } else {
        dom.screwDriverStatusDiv.classList.remove('active', 'loading');
    }

    // Update PLCM Status (Example logic)
    if (state.isContinuousMode) { // Or based on actual PLCM connection
        dom.plcmStatusDiv.classList.add('active');
         dom.plcmStatusDiv.classList.remove('loading', 'history-mode');
    } else if (state.userSelectedPreviousCycle) {
         dom.plcmStatusDiv.classList.add('history-mode'); // Indicate viewing history
         dom.plcmStatusDiv.classList.remove('active', 'loading');
    }
     else {
        dom.plcmStatusDiv.classList.remove('active', 'loading', 'history-mode');
    }
}

// --- Capture Cycle Screenshot ---
export async function captureCycleScreenshot() {
    console.log("Attempting to capture cycle screenshot...");
    const imageContainerElement = dom.imageContainer;

    if (!imageContainerElement || typeof window.html2canvas !== 'function') {
        const reason = !imageContainerElement ? "Image container element not found." : "html2canvas library not found.";
        console.error(`Screenshot capture failed: ${reason}`);
        throw new Error(`Screenshot capture failed: ${reason}`); // Throw error to be caught
    }

    try {
        console.log("Calling html2canvas for screenshot...");
        const canvas = await window.html2canvas(imageContainerElement, {
            useCORS: true,
            logging: true,
            scale: 2,
            backgroundColor: '#ffffff'
        });
        console.log("html2canvas finished.");
        return canvas.toDataURL('image/png'); // Return the data URL
    } catch (canvasError) {
        console.error("Error generating canvas from image container:", canvasError);
        throw canvasError; // Re-throw error
    }
}
