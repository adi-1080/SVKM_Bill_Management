import { generateExcelReport, generatePDFReport } from "../utils/report-generator.js";
import {  importBillsFromCSV,importBillsFromExcel } from "../utils/csv-handler.js";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

const generateReport = async (req, res) => {
  try {
    const { billIds, format = 'excel' } = req.body;
    
    // Normalize billIds input
    const ids = Array.isArray(billIds) ? billIds : billIds.split(',').map(id => id.trim());
    
    // Validate IDs
    if (!ids.length) {
      return res.status(400).json({ 
        success: false, 
        message: "No bill IDs provided" 
      });
    }

    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid bill ID format",
        invalidIds 
      });
    }

    // Generate report based on format
    let fileBuffer, fileName, contentType;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format.toLowerCase()) {
      case 'pdf':
        fileBuffer = await generatePDFReport(ids);
        fileName = `bills-report-${timestamp}.pdf`;
        contentType = "application/pdf";
        break;
      
      case 'csv':
        fileBuffer = await exportBillsToCSV(ids);
        fileName = `bills-report-${timestamp}.csv`;
        contentType = "text/csv";
        break;
        
      case 'excel':
      default:
        fileBuffer = await generateExcelReport(ids);
        fileName = `bills-report-${timestamp}.xlsx`;
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
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
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const validExcelMimeTypes = [
      'application/vnd.ms-excel',                                          // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.oasis.opendocument.spreadsheet',                    // .ods
      'text/csv'                                                           // .csv
    ];
    
    const validExtensions = /xlsx|xls|csv|ods/i;
    const extname = validExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = validExcelMimeTypes.includes(file.mimetype);

    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname).toLowerCase()
    });
    
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error(`Invalid file type. Allowed types: xlsx, xls, csv. Received mimetype: ${file.mimetype}`));
  }
}).any();

const importBills = async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              reject(new Error('File size too large. Maximum size is 10MB'));
              break;
            default:
              reject(new Error(`File upload error: ${err.message}`));
          }
        } else if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const uploadedFile = req.files[0]; // Get the first uploaded file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uploadedFile.originalname);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, uploadedFile.buffer);
    
    // Determine file type and process accordingly
    const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
    let importResult;

    try {
      if (fileExtension === '.csv') {
        importResult = await importBillsFromCSV(tempFilePath);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        importResult = await importBillsFromExcel(tempFilePath);
      } else {
        throw new Error("Unsupported file format");
      }
    } finally {
      // Clean up temp file regardless of success or failure
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully imported ${importResult.length} bills`,
      count: importResult.length,
      data: importResult.map(bill => ({ _id: bill._id, srNo: bill.srNo }))
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import bills",
      error: error.message
    });
  }
};
export default { generateReport, importBills };