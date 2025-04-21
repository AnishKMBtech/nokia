import * as config from './config.js';
import * as state from './state.js';
import * as ui from './uiUpdates.js';

// Fetch screw data from the server - SIMPLIFIED
export async function fetchScrewData() {
    try {
        // No loading indicator needed here; workflow.js handles it.
        const response = await fetch('/api/screws');
        if (!response.ok) {
            // Log the error status text for more context
            const errorBody = await response.text(); // Read body for detailed error
            console.error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${errorBody}`);
            // Throw a more informative error
            throw new Error(`HTTP error ${response.status}: ${response.statusText}. Server response: ${errorBody}`);
        }

        const newData = await response.json();
        // console.log('API fetched data:', newData); // Optional: Log fetched data
        // No sorting or processing here - just return raw data
        return newData;

    } catch (error) {
        // Log the specific error encountered during fetch or JSON parsing
        console.error("Failed to fetch or parse screw data in api.js:", error);
        // Return null to indicate failure to the caller (workflow.js)
        return null;
    }
    // No finally block needed for loading state here
}
