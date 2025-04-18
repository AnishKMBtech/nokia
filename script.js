document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const screwDataTableBody = document.getElementById('screwDataTableBody');
    const currentScrewIdSpan = document.getElementById('currentScrewId');
    const currentAngleSpan = document.getElementById('currentAngle');
    const currentTorqueSpan = document.getElementById('currentTorque');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const markersOverlay = document.getElementById('screw-markers-overlay');
    const donutChart = document.getElementById('donutChart');
    const chartText = document.getElementById('chartText');
    const screwDriverStatusLight = document.getElementById('screwDriverStatus');
    const plcmStatusLight = document.getElementById('plcmStatus');
    const dateTimeSpan = document.getElementById('datetime');

    // --- Configuration & State ---
    const totalScrews = 19;
    let currentScrewIndex = 0; // 0 means not started
    let simulationTimeout = null; // Use setTimeout for sequencing
    let isRunning = false;
    const processingDelay = 750; // ms to show yellow marker
    const stepDelay = 1500; // ms between starting each screw processing

    // Sample Data (Simulating backend source like CSV/SQL)
    // Each object: { id, angleMin, angleMax, actualAngle, torqueMin, torqueMax, actualTorque }
    const screwDataSet = [
        { id: 1, angleMin: 3600, angleMax: 5500, actualAngle: 3782, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.4 },
        { id: 2, angleMin: 3600, angleMax: 5500, actualAngle: 3939, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.6 },
        { id: 3, angleMin: 3600, angleMax: 5500, actualAngle: 5422, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.2 },
        { id: 4, angleMin: 3600, angleMax: 5500, actualAngle: 4567, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
        { id: 5, angleMin: 3600, angleMax: 5500, actualAngle: 4867, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.3 },
        { id: 6, angleMin: 3600, angleMax: 5500, actualAngle: 5789, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.9 }, // Torque NOK
        { id: 7, angleMin: 3600, angleMax: 5500, actualAngle: 4656, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
        { id: 8, angleMin: 3600, angleMax: 5500, actualAngle: 3500, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.4 }, // Angle NOK
        { id: 9, angleMin: 3600, angleMax: 5500, actualAngle: 5100, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.7 },
        { id: 10, angleMin: 3600, angleMax: 5500, actualAngle: 4950, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.6 },
        { id: 11, angleMin: 3600, angleMax: 5500, actualAngle: 4780, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.2 },
        { id: 12, angleMin: 3600, angleMax: 5500, actualAngle: 5600, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.3 }, // Angle NOK
        { id: 13, angleMin: 3600, angleMax: 5500, actualAngle: 4200, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
        { id: 14, angleMin: 3600, angleMax: 5500, actualAngle: 4350, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.1 },
        { id: 15, angleMin: 3600, angleMax: 5500, actualAngle: 5050, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 3.0 }, // Torque NOK
        { id: 16, angleMin: 3600, angleMax: 5500, actualAngle: 4880, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.4 },
        { id: 17, angleMin: 3600, angleMax: 5500, actualAngle: 4610, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.6 },
        { id: 18, angleMin: 3600, angleMax: 5500, actualAngle: 4999, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.7 },
        { id: 19, angleMin: 3600, angleMax: 5500, actualAngle: 5234, torqueMin: 2.1, torqueMax: 2.8, actualTorque: 2.5 },
    ];

    // Marker positions (approximated percentages for 19 screws)
    // Adjust these based on your actual hardware_image.png
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
        { id: 13, left: '30%', top: '25%' }, // Inner screws start
        { id: 14, left: '40%', top: '35%' },
        { id: 15, left: '50%', top: '40%' },
        { id: 16, left: '60%', top: '35%' },
        { id: 17, left: '70%', top: '30%' },
        { id: 18, left: '50%', top: '55%' }, // Center-ish screw
        { id: 19, left: '30%', top: '50%' }, // Near start/end area from prev image
    ];

    // --- Functions ---

    // Update Date & Time
    function updateDateTime() {
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const dateString = now.toLocaleDateString('en-GB', dateOptions);
        const timeString = now.toLocaleTimeString('en-GB', timeOptions);
        dateTimeSpan.textContent = `${dateString} ${timeString}`;
    }

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
        updateScrewCountDisplay();
        updateCurrentScrewDetails(null); // Clear details
        clearAllMarkerStates(true); // Pass true to clear all states on reset
        // Deactivate status lights
        screwDriverStatusLight.classList.remove('active');
        plcmStatusLight.classList.remove('active');
    }

    // Clear processing/success/fail states from all markers
    function clearAllMarkerStates(clearAll = false) {
        document.querySelectorAll('.screw-marker').forEach(m => {
            m.classList.remove('processing');
            if (clearAll) { // Only remove success/fail on full reset
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
        // Clear only the 'processing' state from other markers
        clearAllMarkerStates(false); 
        const marker = document.getElementById(`screw-marker-${screw.id}`);
        if (marker) {
            // Remove previous success/fail before adding processing
            marker.classList.remove('success', 'fail'); 
            marker.classList.add('processing');
        }

        // Update displays immediately
        updateScrewCountDisplay();
        updateCurrentScrewDetails(screw);

        // Add row to table if not present, scroll to it
        let row = document.getElementById(`screw-row-${screw.id}`);
        if (!row) {
            row = screwDataTableBody.insertRow();
            row.id = `screw-row-${screw.id}`;
            row.insertCell(0).textContent = screw.id;
            row.insertCell(1).textContent = screw.angleMin;
            row.insertCell(2).textContent = screw.angleMax;
            row.insertCell(3).textContent = screw.actualAngle; // Display actual value
            row.insertCell(4).textContent = screw.torqueMin.toFixed(1);
            row.insertCell(5).textContent = screw.torqueMax.toFixed(1);
            row.insertCell(6).textContent = screw.actualTorque; // Display actual value
        }
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Clear previous row highlights immediately
        row.className = '';

        // --- Phase 2: Show Result (Green/Red) after delay ---
        simulationTimeout = setTimeout(() => {
            if (!isRunning) return; // Check if stopped during the delay

            // Determine status
            const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
            const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
            const status = isAngleOk && isTorqueOk ? 'ok' : 'nok';

            // Update marker state
            if (marker) {
                marker.classList.remove('processing');
                marker.classList.add(status === 'ok' ? 'success' : 'fail');
            }

            // Update table row highlighting
            if (row) {
                row.classList.add(status === 'ok' ? 'highlight-ok' : 'highlight-nok');
            }

            // Schedule the next step
            if (currentScrewIndex < totalScrews) {
                 simulationTimeout = setTimeout(processNextScrew, stepDelay - processingDelay);
            } else {
                stopSimulation('Completed');
            }

        }, processingDelay);
    }

    // Update the Screw Count Donut Chart and Text
    function updateScrewCountDisplay() {
        const percentage = totalScrews > 0 ? (currentScrewIndex / totalScrews) * 100 : 0;
        donutChart.style.background = `conic-gradient(#0055a4 0% ${percentage}%, #e0e0e0 ${percentage}% 100%)`;
        chartText.textContent = `${currentScrewIndex}/${totalScrews}`;
    }

    // Update the top-right screw details section
    function updateCurrentScrewDetails(screw) {
        if (screw) {
            currentScrewIdSpan.textContent = screw.id;
            currentAngleSpan.textContent = screw.actualAngle;
            currentTorqueSpan.textContent = screw.actualTorque.toFixed(1);
        } else {
            currentScrewIdSpan.textContent = '-';
            currentAngleSpan.textContent = '-';
            currentTorqueSpan.textContent = '-';
        }
    }

    // Start the simulation
    function startSimulation() {
        if (isRunning) return; // Prevent multiple starts
        console.log('Simulation Started');
        isRunning = true;
        resetDashboard(); // Start fresh
        // Activate status lights
        screwDriverStatusLight.classList.add('active');
        plcmStatusLight.classList.add('active');
        // Start the first step
        simulationTimeout = setTimeout(processNextScrew, 50); // Short delay before first step
    }

    // Stop the simulation
    function stopSimulation(reason = 'Stopped') {
        if (!isRunning && reason !== 'Completed' && reason !== 'Error') return; // Don't log stop if already stopped unless completed/error
        console.log(`Simulation ${reason}`);
        clearTimeout(simulationTimeout); // Clear any pending timeout
        simulationTimeout = null;
        isRunning = false;
        // Optional: Clear processing state if stopped mid-process
        // clearAllMarkerStates(); 
        // Keep status lights active until reset/new start?
        // screwDriverStatusLight.classList.remove('active');
        // plcmStatusLight.classList.remove('active');
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', startSimulation);
    stopBtn.addEventListener('click', () => stopSimulation('Stopped by user'));

    // Add listeners for new action buttons (optional, placeholder)
    document.querySelectorAll('.btn-action').forEach(button => {
        button.addEventListener('click', (event) => {
            console.log(`${event.target.textContent} button clicked`);
            // Add specific functionality later
        });
    });

    // --- Initial Setup ---
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update time every second
    createMarkers();
    resetDashboard(); // Set initial state
    updateScrewCountDisplay(); // Show 0/19 initially

});
