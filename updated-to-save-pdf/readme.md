npm install pdfkit
npm install jspdf jspdf-autotable


Modified index.html: Add script tags for jspdf and jspdf-autotable.
Modified script.js: Add an event listener to the "GENERATE REPORT" button (generateReportBtn) that will:
Gather the data from the table and the ID fields.
Use jspdf and jspdf-autotable to create the PDF.
Prompt the user to save the generated PDF file.
