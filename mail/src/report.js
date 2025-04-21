// src/report.js
import { state } from './state.js';
import { totalScrews } from './config.js'; // <-- Added import for totalScrews
import * as dom from './dom.js'; // Import dom elements
// Remove the mailer import, it will be handled by the server
// import { sendReportEmail } from './mailer.js';

// Make the function async to use await for html2canvas and email sending
// Add cycleId parameter
export async function generateReport(cycleId) {
    // Check if data is available
    if (state.screwDataSet.length === 0) {
        alert("No data available to generate report. Please start monitoring first.");
        return;
    }

    // Determine overall status
    const hasFailures = state.screwDataSet.some(screw => {
        const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
        const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
        return !(isAngleOk && isTorqueOk);
    });
    const overallStatus = hasFailures ? 'FAIL' : 'PASS';

    // Get current date and time for the report
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

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

        // Add Table using jspdf-autotable (on the first page)
        doc.autoTable({
            head: [["Screw ID", "Angle Min", "Angle Max", "Angle Actual", "Torque Min", "Torque Max", "Torque Actual", "Status"]],
            body: state.screwDataSet.map(screw => {
                const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
                const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
                const status = isAngleOk && isTorqueOk ? 'PASS' : 'FAIL';

                return [
                    screw.displayId,
                    screw.angleMin,
                    screw.angleMax,
                    screw.actualAngle,
                    screw.torqueMin.toFixed(1),
                    screw.torqueMax.toFixed(1),
                    screw.actualTorque.toFixed(1),
                    status
                ];
            }),
            startY: headerY2 + 10, // Start table after header
            theme: 'grid',
            headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 15 },
                7: { cellWidth: 15 }
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

        // --- Add Screenshot of Image Container using html2canvas ---
        console.log("Attempting to add screenshot...");
        const imageContainerElement = dom.imageContainer;
        console.log("Image container element found:", imageContainerElement ? 'Yes' : 'No');
        if (imageContainerElement) {
            console.log("Image container dimensions:", imageContainerElement.offsetWidth, "x", imageContainerElement.offsetHeight);
            console.log("Image container visibility:", window.getComputedStyle(imageContainerElement).display);
        }
        console.log("html2canvas available:", typeof window.html2canvas); // Log if library is loaded

        if (imageContainerElement && typeof window.html2canvas === 'function') {
            doc.addPage(); // Add a new page for the screenshot
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Hardware Base Screenshot with Indicators", 15, 15);

            try {
                console.log("Calling html2canvas...");
                const canvas = await window.html2canvas(imageContainerElement, {
                    useCORS: true, // Important if image is from a different origin
                    logging: true, // Enable html2canvas logging
                    scale: 2, // Increase scale for better resolution
                    backgroundColor: '#ffffff' // Set background for transparency
                });
                console.log("html2canvas finished, adding image to PDF...");
                const imgData = canvas.toDataURL('image/png');

                // Calculate image dimensions to fit the page
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 30; // Page width with margin
                const pdfHeight = doc.internal.pageSize.getHeight() - 30; // Page height with margin
                const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
                const imgWidth = imgProps.width * ratio;
                const imgHeight = imgProps.height * ratio;
                const x = (doc.internal.pageSize.getWidth() - imgWidth) / 2; // Center horizontally
                const y = 25; // Position below the title on the new page

                doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                console.log("Screenshot added to PDF.");

            } catch (canvasError) {
                console.error("Error generating canvas from image container:", canvasError);
                console.error("Canvas Error Name:", canvasError.name);
                console.error("Canvas Error Message:", canvasError.message);
                console.error("Canvas Error Stack:", canvasError.stack);
                // Add error message to the PDF page instead of the image
                doc.setFontSize(10);
                doc.setTextColor(255, 0, 0);
                doc.text(`Error: Could not generate screenshot. Check console for details. Error: ${canvasError.name} - ${canvasError.message}`, 15, 25, { maxWidth: doc.internal.pageSize.getWidth() - 30 });
            }
        } else {
            // Handle case where html2canvas or container is missing
            const reason = !imageContainerElement ? "Image container element not found." : "html2canvas library not found.";
            console.error(`Screenshot skipped: ${reason}`);
            doc.addPage(); // Still add a page but show the error
            doc.setFontSize(10);
            doc.setTextColor(255, 0, 0);
            doc.text(`Error: Screenshot skipped. ${reason}`, 15, 15);
        }

        // --- Generate PDF Output and Send to Backend ---
        const pdfFilename = `Screw_Report_Cycle_${cycleId}_${formattedDate.replace(/\./g, '-')}_${formattedTime.replace(/:/g, '')}.pdf`;
        const pdfDataUri = doc.output('datauristring'); // Generate PDF as data URI

        // --- Send data to the backend endpoint --- 
        try {
            const response = await fetch('/api/send-report', { // Changed endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pdfDataUri: pdfDataUri,
                    filename: pdfFilename,
                    status: overallStatus,
                    cycleNumber: cycleId,
                    timestamp: now.toISOString() // Send timestamp as ISO string
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log(`Report data sent to server for email for cycle ${cycleId}. Server response:`, result.messageId || 'Success');
                // Optionally provide user feedback that email is being sent
                // alert(`Report for cycle ${cycleId} is being sent via email.`);
            } else {
                console.error(`Server failed to send email for cycle ${cycleId}:`, result.error || response.statusText);
                alert(`Server encountered an error sending the email for cycle ${cycleId}. Please check server logs.`);
            }
        } catch (fetchError) {
            console.error(`Error sending report data to server for cycle ${cycleId}:`, fetchError);
            alert(`Failed to communicate with the server to send the email for cycle ${cycleId}.`);
        }

        // Save the PDF locally (optional)
        doc.save(pdfFilename);
        console.log(`PDF report generated locally for cycle ${cycleId}: ${pdfFilename}`);

    } catch (reportError) {
        console.error(`Error during report generation for cycle ${cycleId}:`, reportError);
        alert(`Failed to generate PDF report for cycle ${cycleId}. See console for details.`);
    }
}

export function checkAndGenerateCycleReport(cycles) {
    cycles.forEach((cycleData, idx) => {
        const cycleId = idx; // Use index as cycle identifier
        if (cycleData.length === totalScrews && !state.generatedCycleReports.has(cycleId)) {
            // Temporarily set screwDataSet for report generation
            const prevScrewDataSet = [...state.screwDataSet];
            state.screwDataSet = cycleData.map((screw, i) => ({
                ...screw,
                displayId: i + 1,
                originalId: screw.id,
                cycleIndex: idx
            }));
            // Pass cycleId to generateReport
            generateReport(cycleId); // Call generateReport with the cycleId
            state.screwDataSet = prevScrewDataSet; // Restore original state
            state.generatedCycleReports.add(cycleId); // Mark this cycle's report as generated
            console.log(`Auto-generated report for cycle index: ${cycleId}`);
        }
    });
}
