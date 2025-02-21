import { generateExcelReport, generatePDFReport } from "../utils/report-generator.js";
import mongoose from "mongoose";

const generateReport = async (req, res) => {
  try {
    const { billIds, format = 'excel' } = req.body;

    // Validate and normalize billIds input
    let ids = [];
    if (typeof billIds === 'string') {
      ids = billIds.split(',').map(id => id.trim());
    } else if (Array.isArray(billIds)) {
      ids = [...billIds];
    }

    // Validate IDs format
    if (!ids.length) {
      return res.status(400).json({ 
        success: false, 
        message: "billIds must contain at least one valid ID" 
      });
    }

    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid bill ID format",
        invalidIds
      });
    }

    // Generate report based on format
    let fileBuffer;
    let fileName;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format.toLowerCase()) {
      case 'pdf':
        fileBuffer = await generatePDFReport(ids);
        fileName = `bills-report-${timestamp}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        break;
        
      case 'excel':
      default:
        fileBuffer = await generateExcelReport(ids);
        fileName = `bills-report-${timestamp}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        break;
    }

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
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