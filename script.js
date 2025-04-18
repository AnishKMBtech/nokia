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
    const totalScrews = 19;
    let currentScrewIndex = 0; // 0 means not started
    let simulationTimeout = null; // Use setTimeout for sequencing
    let isRunning = false;
    const processingDelay = 750; // ms to show yellow marker
    const stepDelay = 1500; // ms between starting each screw processing
    let simulationStartTime = null;
    let simulationEndTime = null;
    let finalScrewData = [];

    // Sample Data (Simulating backend source like CSV/SQL)
    const screwDataSet = [
        { id: 1, angleMin: 3600, angleMax: 5500, actualAngle: 3782, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.4 },
        { id: 2, angleMin: 3600, angleMax: 5500, actualAngle: 3939, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.6 },
        { id: 3, angleMin: 3600, angleMax: 5500, actualAngle: 5422, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.2 },
        { id: 4, angleMin: 3600, angleMax: 5500, actualAngle: 4567, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
        { id: 5, angleMin: 3600, angleMax: 5500, actualAngle: 4867, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.3 },
        { id: 6, angleMin: 3600, angleMax: 5500, actualAngle: 5789, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.9 },
        { id: 7, angleMin: 3600, angleMax: 5500, actualAngle: 4656, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
        { id: 8, angleMin: 3600, angleMax: 5500, actualAngle: 3500, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.4 },
        { id: 9, angleMin: 3600, angleMax: 5500, actualAngle: 5100, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.7 },
        { id: 10, angleMin: 3600, angleMax: 5500, actualAngle: 4950, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.6 },
        { id: 11, angleMin: 3600, angleMax: 5500, actualAngle: 4780, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.2 },
        { id: 12, angleMin: 3600, angleMax: 5500, actualAngle: 5600, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.3 },
        { id: 13, angleMin: 3600, angleMax: 5500, actualAngle: 4200, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
        { id: 14, angleMin: 3600, angleMax: 5500, actualAngle: 4350, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.1 },
        { id: 15, angleMin: 3600, angleMax: 5500, actualAngle: 5050, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 3.0 },
        { id: 16, angleMin: 3600, angleMax: 5500, actualAngle: 4880, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.4 },
        { id: 17, angleMin: 3600, angleMax: 5500, actualAngle: 4610, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.6 },
        { id: 18, angleMin: 3600, angleMax: 5500, actualAngle: 4999, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.7 },
        { id: 19, angleMin: 3600, angleMax: 5500, actualAngle: 5234, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
    ];

    // Marker positions (approximated percentages for 19 screws)
    const markerPositions = [
        { id: 1, left: '11%', top: '25%' },
        { id: 2, left: '18%', top: '45%' },
        { id: 3, left: '25%', top: '60%' },
        { id: 4, left: '35%', top: '70%' },
        { id: 5, left: '45%', top: '75%' },
        { id: 6, left: '55%', top: '70%' },
        { id: 7, left: '65%', top: '60%' },
        { id: 8, left: '75%', top: '45%' },
        { id: 9, left: '82%', top: '25%' },
        { id: 10, left: '70%', top: '15%' },
        { id: 11, left: '55%', top: '10%' },
        { id: 12, left: '40%', top: '15%' },
        { id: 13, left: '30%', top: '25%' },
        { id: 14, left: '40%', top: '35%' },
        { id: 15, left: '50%', top: '40%' },
        { id: 16, left: '60%', top: '35%' },
        { id: 17, left: '70%', top: '30%' },
        { id: 18, left: '50%', top: '55%' },
        { id: 19, left: '30%', top: '50%' },
    ];

    // --- Functions ---

    // Create Markers on the image
    function createMarkers() {
        markersOverlay.innerHTML = ''; // Clear existing markers
        markerPositions.forEach(pos => {
            const marker = document.createElement('div');
            marker.className = 'screw-marker';
            marker.id = `screw-marker-${pos.id}`;
            marker.style.left = pos.left;
            marker.style.top = pos.top;
            marker.textContent = pos.id; // Add screw number text
            markersOverlay.appendChild(marker);
        });
    }

    // Reset the dashboard to initial state
    function resetDashboard() {
        currentScrewIndex = 0;
        screwDataTableBody.innerHTML = ''; // Clear table
        updateCurrentScrewDetails(null); // Clear details
        clearAllMarkerStates(true); // Pass true to clear all states on reset
        screwDriverStatusDiv.classList.remove('active');
        plcmStatusDiv.classList.remove('active');
        simulationStartTime = null; // Reset times
        simulationEndTime = null;
        finalScrewData = []; // Clear previous report data
    }

    // Clear processing/success/fail states from all markers
    function clearAllMarkerStates(clearAll = false) {
        document.querySelectorAll('.screw-marker').forEach(m => {
            m.classList.remove('processing');
            if (clearAll) {
                m.classList.remove('success', 'fail');
            }
        });
    }

    // Process the next screw in the sequence
    function processNextScrew() {
        if (!isRunning || currentScrewIndex >= totalScrews) {
            stopSimulation(currentScrewIndex >= totalScrews ? 'Completed' : 'Stopped');
            return;
        }

        currentScrewIndex++;
        const screw = screwDataSet.find(s => s.id === currentScrewIndex);

        if (!screw) {
            console.error(`Data for screw ID ${currentScrewIndex} not found!`);
            stopSimulation('Error');
            return;
        }

        // --- Phase 1: Show Processing (Yellow) ---
        clearAllMarkerStates(false);
        const marker = document.getElementById(`screw-marker-${screw.id}`);
        if (marker) {
            marker.classList.remove('success', 'fail');
            marker.classList.add('processing');
        }

        updateCurrentScrewDetails(screw);

        let row = document.getElementById(`screw-row-${screw.id}`);
        if (!row) {
            row = screwDataTableBody.insertRow();
            row.id = `screw-row-${screw.id}`;
            row.insertCell(0).textContent = screw.id;
            row.insertCell(1).textContent = screw.angleMin;
            row.insertCell(2).textContent = screw.angleMax;
            row.insertCell(3).textContent = screw.actualAngle;
            row.insertCell(4).textContent = screw.torqueMin.toFixed(1);
            row.insertCell(5).textContent = screw.torqueMax.toFixed(1);
            row.insertCell(6).textContent = screw.actualTorque.toFixed(1);
        }
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        row.className = '';

        // --- Phase 2: Show Result (Green/Red) after delay ---
        simulationTimeout = setTimeout(() => {
            if (!isRunning) return;

            const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
            const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
            const status = isAngleOk && isTorqueOk ? 'PASS' : 'FAIL';

            // Store result for report (Combine Angle and Torque into one entry)
            finalScrewData.push({
                id: screw.id,
                description: `TRX COVER TIGHTNING ${screw.id}`,
                angleMin: screw.angleMin,
                angleMax: screw.angleMax,
                actualAngle: screw.actualAngle,
                torqueMin: screw.torqueMin.toFixed(2),
                torqueMax: screw.torqueMax.toFixed(2),
                actualTorque: screw.actualTorque.toFixed(1),
                status: status // Overall status for the screw
            });

            // Update marker state
            if (marker) {
                marker.classList.remove('processing');
                marker.classList.add(status === 'PASS' ? 'success' : 'fail');
            }

            // Update table row highlighting
            if (row) {
                row.classList.add(status === 'PASS' ? 'highlight-ok' : 'highlight-nok');
            }

            // Schedule the next step
            if (currentScrewIndex < totalScrews) {
                simulationTimeout = setTimeout(processNextScrew, stepDelay - processingDelay);
            } else {
                stopSimulation('Completed');
            }

        }, processingDelay);
    }

    // Update the top-right screw details section
    function updateCurrentScrewDetails(screw) {
        if (screw) {
            presentScrewIdInput.value = screw.id;
            presentAngleInput.value = screw.actualAngle;
            presentTorqueInput.value = screw.actualTorque.toFixed(1);
        } else {
            presentScrewIdInput.value = '-';
            presentAngleInput.value = '-';
            presentTorqueInput.value = '-';
        }
    }

    // Start the simulation
    function startSimulation() {
        console.log('Simulation Started');
        isRunning = true;
        resetDashboard();
        simulationStartTime = new Date();

        // Update button and status displays
        startBtn.textContent = 'STOP';
        startBtn.classList.remove('start');
        startBtn.classList.add('stop');
        screwDriverStatusDiv.classList.add('active');
        plcmStatusDiv.classList.add('active');

        simulationTimeout = setTimeout(processNextScrew, 50);
    }

    // Stop the simulation
    function stopSimulation(reason = 'Stopped') {
        if (isRunning || reason === 'Completed' || reason === 'Error') {
            simulationEndTime = new Date();
        }

        console.log(`Simulation ${reason}`);
        clearTimeout(simulationTimeout);
        simulationTimeout = null;
        isRunning = false;

        // Update button and status displays
        startBtn.textContent = 'START';
        startBtn.classList.remove('stop');
        startBtn.classList.add('start');
        screwDriverStatusDiv.classList.remove('active');
        plcmStatusDiv.classList.remove('active');
    }

    // --- Toggle Simulation Function ---
    function toggleSimulation() {
        if (isRunning) {
            stopSimulation('Stopped by user');
        } else {
            startSimulation();
        }
    }

    // --- Generate Report Function ---
    function generateReport() {
        if (!simulationStartTime) {
            alert("Please run the simulation first to generate a report.");
            return;
        }

        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            alert("Popup blocked! Please allow popups for this site to generate the report.");
            return;
        }

        const overallStatus = finalScrewData.some(item => item.status === 'FAIL') ? 'FAIL' : 'PASS';
        const endTime = simulationEndTime || new Date();
        const testTimeSeconds = Math.round((endTime - simulationStartTime) / 1000);

        const formatDateTime = (date) => {
            if (!date) return '-';
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const y = date.getFullYear();
            const h = date.getHours().toString().padStart(2, '0');
            const min = date.getMinutes().toString().padStart(2, '0');
            const s = date.getSeconds().toString().padStart(2, '0');
            return `${d}.${m}.${y} ${h}:${min}:${s}`;
        };

        let reportHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Measurement Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; font-size: 10pt; }
                    .report-container { border: 1px solid #ccc; padding: 15px; background-color: #fff; }
                    .report-title { font-size: 16pt; font-weight: bold; color: #0055a4; margin-bottom: 15px; text-align: center; }
                    .report-header { border: 1px solid #eee; background-color: #f8f9fa; padding: 10px; margin-bottom: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 15px; font-size: 9pt; }
                    .report-header div { display: flex; justify-content: space-between; }
                    .report-header span:first-child { font-weight: bold; color: #555; }
                    .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .report-table th, .report-table td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; vertical-align: top; }
                    .report-table th { background-color: #e9ecef; font-weight: bold; }
                    .report-table td.status-pass { background-color: #90ee90; color: black; font-weight: bold; text-align: center; }
                    .report-table td.status-fail { background-color: #f08080; color: black; font-weight: bold; text-align: center; }
                    .report-table td.result, .report-table td.limit { text-align: right; }
                    .measurement-pair { display: block; margin-bottom: 2px; }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="report-title">Measurement Report for the Robot (${overallStatus === 'FAIL' ? 'Failure' : 'Success'})</div>
                    <div class="report-header">
                        <div><span>Site:</span> <span>IN04</span></div>
                        <div><span>Resource:</span> <span>MAC_LINE02_SCREW_03</span></div>
                        <div><span>Times Processed:</span> <span>1</span></div>
                        <div><span>SFC:</span> <span>K9251611248</span></div>
                        <div><span>Test Plan:</span> <span>K908041</span></div>
                        <div><span>Start Time:</span> <span>${formatDateTime(simulationStartTime)}</span></div>
                        <div><span>Item:</span> <span>474198A.101</span></div>
                        <div><span>Diagnostics:</span> <span>PRODUCTION</span></div>
                        <div><span>Stop Time:</span> <span>${formatDateTime(endTime)}</span></div>
                        <div><span>Operation:</span> <span>ROBOT_SCREW_03_IN04</span></div>
                        <div><span>Test Status:</span> <span style="font-weight:bold; color: ${overallStatus === 'FAIL' ? 'red' : 'green'}">${overallStatus}</span></div>
                        <div><span>Test Time:</span> <span>${testTimeSeconds} seconds</span></div>
                    </div>

                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Description</th>
                                <th>Low Limit</th>
                                <th>High Limit</th>
                                <th>Result</th>
                                <th>UOM</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Generate table rows from finalScrewData (now 1 entry per screw)
        finalScrewData.forEach(item => {
            reportHTML += `
                <tr>
                    <td rowspan="2">Screw ${item.id}</td>
                    <td rowspan="2">${item.description}</td>
                    <td class="limit">${item.angleMin}</td>
                    <td class="limit">${item.angleMax}</td>
                    <td class="result">${item.actualAngle}</td>
                    <td>deg</td>
                    <td rowspan="2" class="status-${item.status.toLowerCase()}">${item.status}</td>
                </tr>
                <tr>
                    <td class="limit">${item.torqueMin}</td>
                    <td class="limit">${item.torqueMax}</td>
                    <td class="result">${item.actualTorque}</td>
                    <td>Nm</td>
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

        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
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
