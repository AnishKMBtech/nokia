import * as dom from './domElements.js'; // Import domElements to get the image container
import * as state from './state.js'; // Import state for cycle number
// Note: jsPDF and autoTable are expected to be available globally via script tags in index.html
// html2canvas is also expected globally

export async function generateReport(reportData, cycleIndex) { // Add cycleIndex parameter
    // Check if data is available
    if (!reportData || reportData.length === 0) {
        alert("No data available to generate report. Please start monitoring first.");
        return;
    }

    // Determine overall status
    const hasFailures = reportData.some(screw => {
        const isAngleOk = screw.actualAngle >= screw.angleMin && screw.actualAngle <= screw.angleMax;
        const isTorqueOk = screw.actualTorque >= screw.torqueMin && screw.actualTorque <= screw.torqueMax;
        return !(isAngleOk && isTorqueOk);
    });
    const overallStatus = hasFailures ? 'FAIL' : 'PASS';

    // Get current date and time for the report
    const now = new Date();
    const timestamp = now.toISOString(); // Use ISO string for consistency
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Calculate Cycle Number (assuming cycles are 1-based)
    const cycleNumber = state.totalCycles - cycleIndex; // Calculate based on total cycles and the 0-based index

    console.log(`Starting PDF generation for Cycle ${cycleNumber}...`); // Log start

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

        reportData.forEach(screw => {
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
        console.log("Adding table to PDF..."); // Log table add
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
        console.log("Table added.");

        // Add Screenshot of Image Container
        console.log("Attempting to add screenshot...");
        const imageContainerElement = dom.imageContainer;
        console.log("Image container element found:", imageContainerElement ? 'Yes' : 'No');
        if (imageContainerElement) {
            console.log("Image container dimensions:", imageContainerElement.offsetWidth, "x", imageContainerElement.offsetHeight);
            console.log("Image container visibility:", window.getComputedStyle(imageContainerElement).display);
        }
        console.log("html2canvas available:", typeof window.html2canvas); // Log if library is loaded

        if (imageContainerElement && typeof window.html2canvas === 'function') {
            doc.addPage();
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Hardware Base Screenshot with Indicators", 15, 15);

            try {
                console.log("Calling html2canvas...");
                const canvas = await window.html2canvas(imageContainerElement, {
                    useCORS: true,
                    logging: true, // Enable html2canvas logging for more details
                    scale: 2, // Using scale might improve quality
                    backgroundColor: '#ffffff' // Add background color to handle potential transparency issues
                });
                console.log("html2canvas finished, adding image to PDF...");
                const imgData = canvas.toDataURL('image/png');

                // Image dimension calculations
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 30; // Page width with margin
                const pdfHeight = doc.internal.pageSize.getHeight() - 30; // Page height with margin
                const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
                const imgWidth = imgProps.width * ratio;
                const imgHeight = imgProps.height * ratio;
                const x = (doc.internal.pageSize.getWidth() - imgWidth) / 2; // Center horizontally
                const y = 25; // Position below the title

                doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                console.log("Screenshot added to PDF.");

            } catch (canvasError) {
                console.error("Error generating canvas from image container:", canvasError);
                console.error("Canvas Error Name:", canvasError.name);
                console.error("Canvas Error Message:", canvasError.message);
                console.error("Canvas Error Stack:", canvasError.stack);
                doc.setFontSize(10);
                doc.setTextColor(255, 0, 0);
                doc.text(`Error: Could not generate screenshot. Check console for details. Error: ${canvasError.name} - ${canvasError.message}`, 15, 25, { maxWidth: doc.internal.pageSize.getWidth() - 30 });
            }
        } else {
            const reason = !imageContainerElement ? "Image container element not found." : "html2canvas library not found.";
            console.error(`Screenshot skipped: ${reason}`);
            doc.addPage();
            doc.setFontSize(10);
            doc.setTextColor(255, 0, 0);
            doc.text(`Error: Screenshot skipped. ${reason}`, 15, 15);
        }

        // --- Return PDF Data URI and Metadata ---
        console.log("Generating PDF Data URI...");
        const pdfDataUri = doc.output('datauristring'); // Generate Data URI
        const pdfFilename = `Screw_Report_Cycle_${cycleNumber}_${formattedDate.replace(/\./g, '-')}_${formattedTime.replace(/:/g, '')}.pdf`;
        console.log(`PDF Data URI generated for ${pdfFilename}`);

        // Return data needed for email sending
        return {
            pdfDataUri: pdfDataUri,
            filename: pdfFilename,
            status: overallStatus,
            cycleNumber: cycleNumber,
            timestamp: timestamp, // Use the consistent timestamp
            reportData: reportData // Include reportData for the FAIL email endpoint
        };

    } catch (pdfError) {
        console.error(`Error generating PDF report for Cycle ${cycleNumber}:`, pdfError);
        alert(`Failed to generate PDF report for Cycle ${cycleNumber}. See console for details.`);
        return null; // Return null or throw error on failure
    }
}
