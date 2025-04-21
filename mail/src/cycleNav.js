// src/cycleNav.js
import { state } from './state.js';
import * as dom from './dom.js';
import { updateCycleDisplay } from './ui.js';

let navContainer = null; // Keep track of the navigation container

export function addSimpleCycleNavigation() {
    removeCycleNavigation(); // Ensure no duplicates

    // Don't add navigation if only one cycle or less
    if (state.totalCycles <= 1) return;

    navContainer = document.createElement('div');
    navContainer.id = 'cycleNavigation';
    navContainer.className = 'minimal-cycle-navigation';

    const prevBtn = createNavButton('Previous Cycle', () => navigateCycle(1)); // Increment currentCycle (moves back in time)
    const latestBtn = createNavButton('Present Cycle', () => navigateCycle(0)); // Set currentCycle to 0

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(latestBtn);

    // Add cycle count text
    const cycleText = document.createElement('small');
    cycleText.id = 'cycleNavText'; // Give it an ID for easy update
    navContainer.appendChild(cycleText);


    // Insert navigation after the present values row
     if (dom.presentValuesRow && dom.presentValuesRow.parentNode) {
        // Insert after the presentValuesRow element
        dom.presentValuesRow.parentNode.insertBefore(navContainer, dom.presentValuesRow.nextSibling);
    } else {
        // Fallback: append to body or another container if presentValuesRow isn't found
        document.body.appendChild(navContainer);
        console.warn('Could not find .present-values-row to insert cycle navigation.');
    }


    updateSimpleCycleButtons(); // Set initial button states and text
}

function createNavButton(text, onClickHandler) {
    const button = document.createElement('button');
    button.className = 'btn-cycle';
    button.textContent = text;
    button.onclick = onClickHandler;
    return button;
}

function navigateCycle(targetCycle) {
    // Apply transition effect
    dom.markersOverlay.querySelectorAll('.screw-marker').forEach(marker => {
        marker.classList.add('transition');
    });
     if (dom.screwDataTableBody) {
        dom.screwDataTableBody.classList.add('transition'); // Add transition to table body
    }


    setTimeout(() => {
        if (targetCycle === 0) { // Go to Present Cycle
            state.currentCycle = 0;
            state.userSelectedPreviousCycle = false;
        } else { // Go to Previous Cycle (increment currentCycle)
            if (state.currentCycle < state.totalCycles - 1) {
                state.currentCycle++;
                state.userSelectedPreviousCycle = true;
            }
        }

        updateCycleDisplay(); // Update table, markers, overlay info
        updateSimpleCycleButtons(); // Update button states and text

        // Remove transition effect after updates
        setTimeout(() => {
            dom.markersOverlay.querySelectorAll('.screw-marker').forEach(marker => {
                marker.classList.remove('transition');
            });
             if (dom.screwDataTableBody) {
                dom.screwDataTableBody.classList.remove('transition');
            }
        }, 50); // Shorter delay after update seems better
    }, 50); // Delay before updating state and UI
}


export function updateSimpleCycleButtons() {
    if (!navContainer) return; // Exit if nav doesn't exist

    const prevBtn = navContainer.querySelector('.btn-cycle:first-child');
    const latestBtn = navContainer.querySelector('.btn-cycle:last-child');
    const cycleText = navContainer.querySelector('#cycleNavText');


    if (!prevBtn || !latestBtn || !cycleText) return;


    // Update active states
    if (state.currentCycle === 0) {
        prevBtn.classList.remove('active');
        latestBtn.classList.add('active');
        cycleText.textContent = `Viewing latest data (Cycle ${state.totalCycles} of ${state.totalCycles})`;
    } else {
        prevBtn.classList.add('active');
        latestBtn.classList.remove('active');
        cycleText.textContent = `Viewing previous cycle ${state.totalCycles - state.currentCycle} of ${state.totalCycles}`;
    }

    // Disable 'Previous' button if viewing the oldest cycle
    prevBtn.disabled = (state.currentCycle >= state.totalCycles - 1);
     // Disable 'Present' button if already viewing the latest cycle
    latestBtn.disabled = (state.currentCycle === 0);
}


export function removeCycleNavigation() {
    if (navContainer) {
        navContainer.remove();
        navContainer = null; // Reset the reference
    }
     // Also remove the cycle overlay label if it exists
    const existingLabel = dom.imageContainer?.querySelector('.cycle-overlay-label');
    if (existingLabel) {
        existingLabel.remove();
    }
}
