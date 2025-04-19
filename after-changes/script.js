document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const screwDataTableBody = document.getElementById('screwDataTableBody');
    const presentScrewIdInput = document.getElementById('presentScrewId');
    const presentAngleInput = document.getElementById('presentAngle');
    const presentTorqueInput = document.getElementById('presentTorque');
    const startBtn = document.getElementById('startBtn');
    const markersOverlay = document.getElementById('screw-markers-overlay');
    const screwDriverStatusDiv = document.getElementById('screwDriverStatus');
    const plcmStatusDiv = document.getElementById('plcmStatus');
    const generateReportBtn = document.getElementById('generateReportBtn');

    // --- Configuration & State ---
    const totalScrews = 19; // Total screws in one complete cycle
    let currentScrewIndex = 0;
    let simulationTimeout = null; // Use setTimeout for sequencing
    let isRunning = false;
    let isLoading = false; // New flag to track loading state
    const processingDelay = 750; // ms to show yellow marker
    const stepDelay = 1500; // ms between starting each screw processing
    let simulationStartTime = null;
    let simulationEndTime = null;
    let finalScrewData = [];
    let screwDataSet = []; // Initialize as empty, will be fetched
    let allScrewtData = []; // Store all historical data
    let currentCycle = 0; // Track which cycle we're viewing (0 = latest)
    let totalCycles = 0; // Total number of cycles available
    let pollingInterval = null; // For continuous data fetching
    const POLLING_DELAY = 500; // 0.5 seconds between polls
    let isContinuousMode = false; // Flag for continuous mode
    let userSelectedPreviousCycle = false; // Track if user selected a previous cycle

    // Marker positions (updated based on the provided image layout)
    const markerPositions = [
        { id: 1, left: '46.8%', top: '64.8%' },
        { id: 2, left: '45.0%', top: '70.8%' },
        { id: 3, left: '38.0%', top: '67.8%' },
        { id: 4, left: '39.0%', top: '48.8%' },
        { id: 5, left: '49.0%', top: '48.8%' },
        { id: 6, left: '65.0%', top: '48.8%' },
        { id: 7, left: '82.0%', top: '49.8%' },
        { id: 8, left: '81.8%', top: '57.8%' },
        { id: 9, left: '81.8%', top: '66.8%' },
        { id: 10, left: '75.0%', top: '72.0%' },
        { id: 11, left: '64.0%', top: '71.0%' },
        { id: 12, left: '56.0%', top: '71.0%' },
        { id: 13, left: '25.0%', top: '68.8%' },
        { id: 14, left: '19.0%', top: '69.8%' },
        { id: 15, left: '20.0%', top: '48.8%' },
        { id: 16, left: '15.0%', top: '10.0%' },
        { id: 17, left: '29.0%', top: '10.0%' },
        { id: 18, left: '42%', top: '10.3%' }, // Adjusted left and top position again for screw 18
        { id: 19, left: '60.8%', top: '10.0%' },
    ];

    // --- Functions ---

    // Fetch screw data from the server - modified to respect user's cycle choice
    async function fetchScrewData() {
        try {
            // Only show loading state for longer operations
            let showLoadingTimerId = setTimeout(() => {
                isLoading = true;
                updateLoadingState(true);
            }, 300);
            
            const response = await fetch('/api/screws');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            clearTimeout(showLoadingTimerId);
            
            const newData = await response.json();
            newData.sort((a, b) => a.id - b.id);
            
            // Detect data changes
            const dataChanged = newData.length !== allScrewtData.length;
            
            // Save current position information before updating data
            const previousTotalCycles = totalCycles;
            const previousCyclePosition = currentCycle;
            
            // Store all data
            allScrewtData = newData;
            
            // Group screws into cycles of 19
            const cycles = [];
            for (let i = 0; i < newData.length; i += totalScrews) {
                cycles.push(newData.slice(i, i + totalScrews));
            }
            
            totalCycles = cycles.length;
            
            // Only switch to latest cycle if user hasn't selected previous cycle manually
            if (isContinuousMode && dataChanged && !userSelectedPreviousCycle) {
                currentCycle = 0;
            } else if (userSelectedPreviousCycle && dataChanged) {
                // If user selected previous cycle and data changed,
                // maintain the relative position from the end
                currentCycle = Math.min(previousCyclePosition, totalCycles - 1);
            }
            
            // Add/update cycle navigation if needed
            if (isContinuousMode) {
                addSimpleCycleNavigation();
            }
            
            // Update UI on the next animation frame for smoother rendering
            requestAnimationFrame(() => {
                updateCycleDisplay();
            });
            
            return true;
        } catch (error) {
            console.error("Failed to fetch screw data:", error);
            if (!isContinuousMode) {
                alert("Error fetching screw data from the server.");
            }
            return false;
        } finally {
            isLoading = false;
            updateLoadingState(false);
        }
    }

    // Simplified loading state function
    function updateLoadingState(isLoading) {
        // Update button and cursor
        startBtn.textContent = isLoading ? 'LOADING...' : (isContinuousMode ? 'STOP' : 'START');
        startBtn.disabled = isLoading;
        document.body.style.cursor = isLoading ? 'wait' : 'default';
        
        // Simple loading indicator in status
        if (isLoading) {
            screwDriverStatusDiv.classList.add('loading');
            plcmStatusDiv.classList.add('loading');
        } else {
            screwDriverStatusDiv.classList.remove('loading', 'active');
            plcmStatusDiv.classList.remove('loading', 'active', 'history-mode');
        }
    }

    // Optimize cycle display updates
    function updateCycleDisplay() {
        // Calculate the cycle index (0 = latest cycle)
        const cycleIndex = currentCycle;
        
        // Group all data into cycles of 19 screws
        const cycles = [];
        for (let i = 0; i < allScrewtData.length; i += totalScrews) {
            cycles.push(allScrewtData.slice(i, i + totalScrews));
        }
        
        // Get the selected cycle (latest by default)
        const selectedCycleIndex = Math.max(0, cycles.length - 1 - cycleIndex);
        const cycleScrews = cycles[selectedCycleIndex] || [];
        
        // Map the screws to IDs 1-19 for display purposes
        screwDataSet = cycleScrews.map((screw, index) => {
            return {
                ...screw,
                displayId: index + 1,
                originalId: screw.id,
                cycleIndex: selectedCycleIndex // Add cycle index to identify which cycle this belongs to
            };
        });
        
        // Clear all markers first
        clearAllMarkerStates(true);
        
        // Apply marker updates on the next animation frame
        requestAnimationFrame(() => {
            updateUIWithMappedData(screwDataSet);
        });
        
        // Add cycle information to the image container
        updateImageOverlayInfo(currentCycle === 0 ? 'Present Cycle' : 'Previous Cycle');
    }
    
    // Add cycle label to the image container
    function updateImageOverlayInfo(cycleLabel) {
        // Remove existing label if any
        const existingLabel = document.querySelector('.cycle-overlay-label');
        if (existingLabel) {
            existingLabel.remove();
        }
        
        // Create new label
        const label = document.createElement('div');
        label.className = 'cycle-overlay-label';
        label.textContent = cycleLabel;
        
        // Add animation class based on which cycle we're viewing
        label.classList.add(cycleLabel === 'Present Cycle' ? 'present' : 'previous');
        
        // Add to image container
        const imageContainer = document.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.appendChild(label);
        }
    }
    
    // Enhanced marker update with optimized transitions
    function updateMarkersWithoutFlicker(screws) {
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
    function clearAllMarkerStates(clearAll = false) {
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
    function updateUIWithMappedData(mappedData) {
        if (!mappedData || mappedData.length === 0) return;
        
        // First pass - cache existing rows
        const existingRows = {};
        Array.from(screwDataTableBody.querySelectorAll('tr[id^="screw-row-"]')).forEach(row => {
            const id = row.id.replace('screw-row-', '');
            existingRows[id] = row;
        });
        
        // Remove placeholder row if it exists
        const placeholderRow = screwDataTableBody.querySelector('td[colspan="7"]');
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
            screwDataTableBody.appendChild(fragment);
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
    function createMarkers() {
        markersOverlay.innerHTML = ''; // Clear existing markers
        markerPositions.forEach(pos => {
            const marker = document.createElement('div');
            // Add 'initial' class for default styling
            marker.className = 'screw-marker initial';
            marker.id = `screw-marker-${pos.id}`;
            marker.style.left = pos.left;
            marker.style.top = pos.top;
            marker.textContent = pos.id; // Add screw number text
            markersOverlay.appendChild(marker);
        });
    }

    // Add a function to simulate processing (replace or integrate with existing logic)
    // This is a placeholder to show how to apply the 'processing' class
    function simulateScrewProcessing(screwId) {
        const marker = document.getElementById(`screw-marker-${screwId}`);
        if (marker) {
            // Remove other states and add processing
            marker.classList.remove('initial', 'success', 'fail');
            marker.classList.add('processing');

            // Simulate processing time
            setTimeout(() => {
                // After processing, remove 'processing' and add 'success' or 'fail'
                // This part should be integrated with your actual data update logic
                marker.classList.remove('processing');
                // Example: marker.classList.add('success'); or marker.classList.add('fail');
                // For now, just reset to initial for demonstration
                marker.classList.add('initial');
            }, processingDelay); // Use the defined processingDelay
        }
    }

    // Reset the dashboard to initial state
    function resetDashboard() {
        currentScrewIndex = 0;
        screwDataTableBody.innerHTML = ''; // Clear table
        updateCurrentScrewDetails(null); // Clear details
        clearAllMarkerStates(true); // Pass true to clear all states and reset to initial
        screwDriverStatusDiv.classList.remove('active');
        plcmStatusDiv.classList.remove('active');
        simulationStartTime = null; // Reset times
        simulationEndTime = null;
        finalScrewData = []; // Clear previous report data

        // Add clear message to table when resetting
        if (screwDataTableBody) {
            const emptyRow = screwDataTableBody.insertRow();
            const cell = emptyRow.insertCell(0);
            cell.colSpan = 7;
            cell.textContent = 'Press START to fetch and display screw data...';
            cell.style.textAlign = 'center';
            cell.style.padding = '20px';
            cell.style.color = '#666';
        }
    }

    // Add the missing updateCurrentScrewDetails function
    function updateCurrentScrewDetails(screw) {
        if (screw) {
            // Directly update present values without animation
            presentScrewIdInput.value = screw.displayId || screw.id;
            presentAngleInput.value = screw.actualAngle;
            presentTorqueInput.value = screw.actualTorque.toFixed(1);
        } else {
            // Clear values
            presentScrewIdInput.value = "";
            presentAngleInput.value = "";
            presentTorqueInput.value = "";
        }
    }

    // Add the missing generateReport function
    function generateReport() {
        // Check if data is available
        if (screwDataSet.length === 0) {
            alert("No data available to generate report. Please start monitoring first.");
            return;
        }

        // Create a new window for the HTML report (optional, can be removed if only PDF is needed)
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            // alert("Popup blocked! Please allow popups for this site to generate the HTML report.");
            // If popup fails, we can still generate the PDF
        }

        // Determine overall status
        const hasFailures = screwDataSet.some(screw => {
            const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
            const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
            return !(isAngleOk && isTorqueOk);
        });
        const overallStatus = hasFailures ? 'FAIL' : 'PASS';

        // Get current date and time for the report
        const now = new Date();
        const formattedDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
        const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // --- Generate HTML Report (optional) ---
        if (reportWindow) {
            let reportHTML = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Screw Measurement Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                        .report-container { border: 1px solid #ccc; padding: 15px; }
                        .report-title { font-size: 18px; font-weight: bold; color: #0055a4; margin-bottom: 15px; text-align: center; }
                        .report-header { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
                        .report-header div { display: flex; justify-content: space-between; padding: 5px; background-color: #f5f5f5; }
                        .report-header span:first-child { font-weight: bold; }
                        .report-table { width: 100%; border-collapse: collapse; }
                        .report-table th, .report-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
                        .report-table th { background-color: #f2f2f2; }
                        .status-pass { background-color: #d4edda; color: #155724; }
                        .status-fail { background-color: #f8d7da; color: #721c24; }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        <div class="report-title">Screw Measurement Report</div>
                        <div class="report-header">
                            <div><span>Date:</span> <span>${formattedDate}</span></div>
                            <div><span>Time:</span> <span>${formattedTime}</span></div>
                            <div><span>Status:</span> <span style="font-weight:bold; color:${overallStatus === 'PASS' ? '#155724' : '#721c24'}">${overallStatus}</span></div>
                            <div><span>Resource:</span> <span>MAC-LINE02</span></div>
                            <div><span>Type:</span> <span>DEPRAG-AS712</span></div>
                            <div><span>Model:</span> <span>ARCA</span></div>
                        </div>

                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Screw ID</th>
                                    <th>Angle Min</th>
                                    <th>Angle Max</th>
                                    <th>Angle Actual</th>
                                    <th>Torque Min</th>
                                    <th>Torque Max</th>
                                    <th>Torque Actual</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            // Add rows for each screw
            screwDataSet.forEach(screw => {
                const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
                const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
                const status = isAngleOk && isTorqueOk ? 'PASS' : 'FAIL';

                reportHTML += `
                    <tr>
                        <td>${screw.displayId}</td>
                        <td>${screw.angleMin}</td>
                        <td>${screw.angleMax}</td>
                        <td>${screw.actualAngle}</td>
                        <td>${screw.torqueMin.toFixed(1)}</td>
                        <td>${screw.torqueMax.toFixed(1)}</td>
                        <td>${screw.actualTorque.toFixed(1)}</td>
                        <td class="status-${status.toLowerCase()}">${status}</td>
                    </tr>
                `;
            });

            reportHTML += `
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            // Write the report content to the new window
            reportWindow.document.write(reportHTML);
            reportWindow.document.close();
        }

        // --- Generate PDF Report ---
        try {
            const { jsPDF } = window.jspdf; // Access jsPDF from the global scope
            const doc = new jsPDF();

            // Add Title
            doc.setFontSize(18);
            doc.setTextColor(0, 85, 164); // Nokia Blue
            doc.text("Screw Measurement Report", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            // Add Header Info
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0); // Black
            const headerY = 30;
            const headerCol1X = 15;
            const headerCol2X = 80;
            const headerCol3X = 145;
            const valueOffset = 25; // Offset for the value text

            doc.text("Date:", headerCol1X, headerY);
            doc.text(formattedDate, headerCol1X + valueOffset, headerY);
            doc.text("Time:", headerCol2X, headerY);
            doc.text(formattedTime, headerCol2X + valueOffset, headerY);
            doc.text("Status:", headerCol3X, headerY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(overallStatus === 'PASS' ? 21 : 114, overallStatus === 'PASS' ? 87 : 28, overallStatus === 'PASS' ? 36 : 36); // Green or Red
            doc.text(overallStatus, headerCol3X + valueOffset, headerY);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0); // Reset to black

            const headerY2 = headerY + 7;
            doc.text("Resource:", headerCol1X, headerY2);
            doc.text("MAC-LINE02", headerCol1X + valueOffset, headerY2);
            doc.text("Type:", headerCol2X, headerY2);
            doc.text("DEPRAG-AS712", headerCol2X + valueOffset, headerY2);
            doc.text("Model:", headerCol3X, headerY2);
            doc.text("ARCA", headerCol3X + valueOffset, headerY2);


            // Prepare Table Data
            const tableColumn = ["Screw ID", "Angle Min", "Angle Max", "Angle Actual", "Torque Min", "Torque Max", "Torque Actual", "Status"];
            const tableRows = [];

            screwDataSet.forEach(screw => {
                const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
                const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
                const status = isAngleOk && isTorqueOk ? 'PASS' : 'FAIL';

                const screwData = [
                    screw.displayId,
                    screw.angleMin,
                    screw.angleMax,
                    screw.actualAngle,
                    screw.torqueMin.toFixed(1),
                    screw.torqueMax.toFixed(1),
                    screw.actualTorque.toFixed(1),
                    status
                ];
                tableRows.push(screwData);
            });

            // Add Table using jspdf-autotable
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: headerY2 + 10, // Start table below header
                theme: 'grid', // 'striped', 'grid', 'plain'
                headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 15 }, // Screw ID
                    7: { cellWidth: 15 }  // Status
                },
                didParseCell: function (data) {
                    // Color PASS/FAIL status cells
                    if (data.column.index === 7 && data.cell.section === 'body') {
                        if (data.cell.raw === 'PASS') {
                            data.cell.styles.fillColor = [212, 237, 218]; // Light green
                            data.cell.styles.textColor = [21, 87, 36];
                        } else if (data.cell.raw === 'FAIL') {
                            data.cell.styles.fillColor = [248, 215, 218]; // Light red
                            data.cell.styles.textColor = [114, 28, 36];
                        }
                    }
                }
            });

            // Save the PDF
            const pdfFilename = `Screw_Report_${formattedDate.replace(/\./g, '-')}_${formattedTime.replace(/:/g, '')}.pdf`;
            doc.save(pdfFilename);
            console.log(`PDF report generated: ${pdfFilename}`);

        } catch (pdfError) {
            console.error("Error generating PDF report:", pdfError);
            alert("Failed to generate PDF report. See console for details.");
        }
    }

    // --- Toggle Simulation Function ---
    function toggleSimulation() {
        if (isLoading) return; // Don't toggle if we're currently loading
        
        if (isRunning) {
            stopSimulation('Stopped by user');
        } else if (isContinuousMode) {
            stopContinuousMode();
        } else {
            startContinuousMode();
        }
    }

    // Start continuous polling
    function startContinuousMode() {
        if (isContinuousMode) return;
        
        console.log('Starting data monitoring...');
        isContinuousMode = true;
        
        resetDashboard();
        
        // Reset user selection flag
        userSelectedPreviousCycle = false;
        
        // Update button state
        startBtn.textContent = 'STOP';
        startBtn.classList.remove('start');
        startBtn.classList.add('stop');
        
        // Add minimal cycle navigation
        addSimpleCycleNavigation();
        
        // Initial data fetch and start polling
        fetchScrewData().then(() => {
            pollingInterval = setInterval(fetchScrewData, POLLING_DELAY);
        });
    }
    
    // Add simplified cycle navigation - only Previous/Present
    function addSimpleCycleNavigation() {
        // Remove existing navigation if present
        removeCycleNavigation();
        
        // Don't add navigation if only one cycle
        if (totalCycles <= 1) return;
        
        // Create minimal navigation container
        const navContainer = document.createElement('div');
        navContainer.id = 'cycleNavigation';
        navContainer.className = 'minimal-cycle-navigation';
        
        // Previous cycle button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-cycle';
        prevBtn.textContent = 'Previous Cycle';
        prevBtn.onclick = () => {
            if (currentCycle < totalCycles - 1) {
                // Apply transition class to markers and table for smoother change
                document.querySelectorAll('.screw-marker').forEach(marker => {
                    marker.classList.add('transition');
                });
                
                // Schedule update after a brief delay
                setTimeout(() => {
                    currentCycle++;
                    userSelectedPreviousCycle = true;
                    updateCycleDisplay();
                    updateSimpleCycleButtons();
                    
                    // Remove transition class
                    setTimeout(() => {
                        document.querySelectorAll('.screw-marker').forEach(marker => {
                            marker.classList.remove('transition');
                        });
                    }, 300);
                }, 50);
            }
        };
        
        // Present (latest) cycle button
        const latestBtn = document.createElement('button');
        latestBtn.className = 'btn-cycle';
        latestBtn.textContent = 'Present Cycle';
        latestBtn.onclick = () => {
            document.querySelectorAll('.screw-marker').forEach(marker => {
                marker.classList.add('transition');
            });
            
            setTimeout(() => {
                currentCycle = 0;
                userSelectedPreviousCycle = false;
                updateCycleDisplay();
                updateSimpleCycleButtons();
                
                setTimeout(() => {
                    document.querySelectorAll('.screw-marker').forEach(marker => {
                        marker.classList.remove('transition');
                    });
                }, 300);
            }, 50);
        };
        
        // Add buttons to container
        navContainer.appendChild(prevBtn);
        navContainer.appendChild(latestBtn);
        
        // Insert navigation after the present values row
        const presentValuesRow = document.querySelector('.present-values-row');
        if (presentValuesRow && presentValuesRow.nextElementSibling) {
            presentValuesRow.parentNode.insertBefore(
                navContainer, 
                presentValuesRow.nextElementSibling
            );
        }
        
        // Set initial button states
        updateSimpleCycleButtons();
    }
    
    // Update simplified cycle buttons state
    function updateSimpleCycleButtons() {
        const prevBtn = document.querySelector('#cycleNavigation .btn-cycle:first-child');
        const latestBtn = document.querySelector('#cycleNavigation .btn-cycle:last-child');
        
        if (!prevBtn || !latestBtn) return;
        
        // Update button active states
        if (currentCycle === 0) {
            prevBtn.classList.remove('active');
            latestBtn.classList.add('active');
        } else {
            prevBtn.classList.add('active');
            latestBtn.classList.remove('active');
        }
        
        // Disable Previous button if at the last cycle
        prevBtn.disabled = (currentCycle >= totalCycles - 1);
        
        // Add visual indicator for current cycle
        const cycleText = document.createElement('small');
        cycleText.textContent = currentCycle === 0 ? 
            'Viewing latest data' : 
            `Viewing cycle ${totalCycles - currentCycle} of ${totalCycles}`;
        
        // Replace any existing text
        const existingText = document.querySelector('#cycleNavigation small');
        if (existingText) {
            existingText.remove();
        }
        
        // Add the text after the buttons
        if (prevBtn.parentNode) {
            prevBtn.parentNode.appendChild(cycleText);
        }
    }
    
    // Stop continuous polling
    function stopContinuousMode() {
        if (!isContinuousMode) return;
        
        console.log('Stopping data monitoring...');
        isContinuousMode = false;
        
        // Clear polling interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        
        // Update button state
        startBtn.textContent = 'START';
        startBtn.classList.add('start');
        startBtn.classList.remove('stop');
        
        // Remove cycle navigation
        removeCycleNavigation();
    }
    
    // Remove cycle navigation
    function removeCycleNavigation() {
        const navContainer = document.getElementById('cycleNavigation');
        if (navContainer) {
            navContainer.remove();
        }
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', toggleSimulation); // Changed to toggleSimulation
    generateReportBtn.addEventListener('click', generateReport);

    document.querySelectorAll('.btn-action:not(#generateReportBtn)').forEach(button => {
        button.addEventListener('click', (event) => {
            console.log(`${event.target.textContent} button clicked`);
        });
    });

    // --- Initial Setup ---
    createMarkers();
    resetDashboard();
    // Ensure initial button state is correct
    startBtn.textContent = 'START';
    startBtn.classList.add('start');
    startBtn.classList.remove('stop');
    screwDriverStatusDiv.classList.remove('active');
    plcmStatusDiv.classList.remove('active');

});
