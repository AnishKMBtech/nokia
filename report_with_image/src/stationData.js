import * as dom from './domElements.js';

// Function to fetch station data
export async function fetchStationData() {
    try {
        // Visual feedback during loading
        dom.stationIdInput.value = "Loading...";
        dom.paletteIdInput.value = "Loading...";
        dom.chassisIdInput.value = "Loading...";

        // Fetch from temp.js API (running on port 3332)
        // Ensure this server is running and accessible
        const response = await fetch('http://localhost:3332/api/station');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const stationData = await response.json();

        // Get the most recent record if available
        if (stationData && stationData.length > 0) {
            const latestData = stationData[stationData.length - 1];

            dom.stationIdInput.value = latestData.station_id || '';
            dom.paletteIdInput.value = latestData.palette_id || '';
            dom.chassisIdInput.value = latestData.chassis_id || '';

            console.log('Station data loaded successfully');
        } else {
            // No data available
            dom.stationIdInput.value = "No data";
            dom.paletteIdInput.value = "No data";
            dom.chassisIdInput.value = "No data";
        }
    } catch (error) {
        console.error('Error fetching station data:', error);
        dom.stationIdInput.value = "Error";
        dom.paletteIdInput.value = "Error";
        dom.chassisIdInput.value = "Error";
    }
}

// Initialize station data fetching
export function initStationData() {
    // Fetch data on page load
    fetchStationData();

    // Refresh button click handler
    if (dom.refreshStationDataBtn) {
        dom.refreshStationDataBtn.addEventListener('click', fetchStationData);
    }

    // Periodically refresh data (every 30 seconds)
    setInterval(fetchStationData, 30000);
}
