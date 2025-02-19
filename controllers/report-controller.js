import { generateExcelReport, generatePDFReport } from "../utils/report-generator.js";

const generateReport = async (req, res) => {
  try {
    const { billIds, format = 'excel' } = req.body;

    // Input validation
    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "billIds must be a non-empty array" 
      });
    }

    // Generate report based on format
    let fileBuffer;
    let fileName;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format.toLowerCase()) {
      case 'pdf':
        fileBuffer = await generatePDFReport(billIds);
        fileName = `bills-report-${timestamp}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        break;
        
      case 'excel':
      default:
        fileBuffer = await generateExcelReport(billIds);
        fileName = `bills-report-${timestamp}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        break;
    }

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Length", fileBuffer.length);
    return res.send(fileBuffer);

  } catch (error) {
    console.error('Report generation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to generate report",
      error: error.message 
    });
  }
};

export default { generateReport };