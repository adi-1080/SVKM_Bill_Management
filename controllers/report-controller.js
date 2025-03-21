import { generateExcelReport, generatePDFReport } from "../utils/report-generator.js";
import { importBillsFromCSV, importBillsFromExcel, organizeQSFields, flattenDoc } from "../utils/csv-handler.js";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import ExcelJS from "exceljs";

// Define a schema for VendorMaster if not already defined
const vendorMasterSchema = new mongoose.Schema({
  vendorNo: { type: String, required: true },
  vendorName: { type: String, required: true }
}, { collection: 'vendorMasters' });

// Try to load VendorMaster model dynamically
let VendorMaster;
try {
  VendorMaster = mongoose.model('VendorMaster'); 
} catch (e) {
  try {
    // If model doesn't exist, register it
    VendorMaster = mongoose.model('VendorMaster', vendorMasterSchema);
    console.log('VendorMaster model registered');
  } catch (registerError) {
    console.log('Failed to register VendorMaster model:', registerError);
  }
}

// Helper function to check if vendor validation should be skipped
const shouldSkipVendorValidation = async () => {
  try {
    if (!VendorMaster) return true;
    
    const count = await VendorMaster.countDocuments();
    console.log(`Found ${count} vendors in database`);
    
    // If empty vendor table, skip validation
    return count === 0;
  } catch (error) {
    console.error('Error checking vendor count:', error);
    return true; // Skip validation on error
  }
};

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

    // Check if we're in patch-only mode (don't create new bills)
    const patchOnly = req.query.patchOnly === 'true';
    console.log(`Import mode: ${patchOnly ? 'patch-only' : 'normal'}`);

    const uploadedFile = req.files[0]; // Get the first uploaded file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uploadedFile.originalname);
    
    console.log(`Processing file: ${uploadedFile.originalname}`);
    
    // Check if we should skip vendor validation
    const skipVendorValidation = await shouldSkipVendorValidation();
    if (skipVendorValidation) {
      console.log('SKIPPING VENDOR VALIDATION - Vendor table is empty or not accessible');
    }
    
    // Extract vendor numbers from Excel/CSV before processing
    // This allows us to validate vendors first
    let vendorNos = [];
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, uploadedFile.buffer);
    
    // Check if VendorMaster model is available and validate vendors
    let validVendors = [];
    let validVendorNames = []; // Added - use vendor names instead of numbers
    if (VendorMaster && !skipVendorValidation) {
      try {
        // Extract vendor information from the file first
        const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
        if (fileExtension === '.xlsx' || fileExtension === '.xls') {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(tempFilePath);
          const worksheet = workbook.getWorksheet(1);
          
          // Find both vendor number and vendor name columns
          const headers = [];
          let vendorNoColIdx = -1;
          let vendorNameColIdx = -1;
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            const header = cell.value?.toString().trim();
            if (header === 'Vendor no') {
              vendorNoColIdx = colNumber;
            }
            if (header === 'Vendor Name') {
              vendorNameColIdx = colNumber;
            }
          });
          
          // If header row not found in first row, try second row (in case of column index row)
          if (vendorNoColIdx === -1 || vendorNameColIdx === -1) {
            worksheet.getRow(2).eachCell((cell, colNumber) => {
              const header = cell.value?.toString().trim();
              if (header === 'Vendor no') {
                vendorNoColIdx = colNumber;
              }
              if (header === 'Vendor Name') {
                vendorNameColIdx = colNumber;
              }
            });
          }
          
          // Extract vendor numbers and names for reference
          if (vendorNoColIdx > 0) {
            console.log(`Found Vendor no column at index ${vendorNoColIdx}`);
            if (vendorNameColIdx > 0) {
              console.log(`Found Vendor Name column at index ${vendorNameColIdx}`);
            }
            
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber > 2) { // Skip potential header rows
                const vendorNo = row.getCell(vendorNoColIdx).value;
                if (vendorNo) {
                  vendorNos.push(String(vendorNo).trim());
                }
              }
            });
          } else {
            console.log('Could not find Vendor no column in Excel file');
          }
        }
        
        // Query vendor master for validation - use vendor names instead of numbers
        try {
          // Count total vendors in database first
          const totalVendorsInDB = await VendorMaster.countDocuments();
          console.log(`Total vendors in database: ${totalVendorsInDB}`);
          
          if (totalVendorsInDB === 0) {
            console.log('WARNING: Vendor table is empty, skipping vendor validation');
            skipVendorValidation = true;
          } else {
            // Get all vendors to validate by name
            const allVendors = await VendorMaster.find().lean();
            validVendors = allVendors;
            
            // Extract vendor names for validation
            validVendorNames = allVendors.map(v => v.vendorName || '');
            
            console.log(`Found ${validVendorNames.length} valid vendor names in the database`);
            if (validVendorNames.length > 0) {
              console.log(`Sample vendor names: ${validVendorNames.slice(0, 5).join(', ')}${validVendorNames.length > 5 ? '...' : ''}`);
            }
            
            if (validVendorNames.length === 0) {
              console.log('WARNING: No vendor names found in the database!');
              
              // Try to get a sample of vendors to debug
              const sampleVendors = await VendorMaster.find().limit(5).lean();
              console.log(`Sample vendors in DB:`, sampleVendors.map(v => ({
                vendorNo: v.vendorNo,
                vendorName: v.vendorName || 'N/A'
              })));
            }
          }
        } catch (findError) {
          console.error('Error querying VendorMaster collection:', findError);
          skipVendorValidation = true;
        }
      } catch (error) {
        console.error('Error pre-validating vendors:', error);
        skipVendorValidation = true;
      }
    } else {
      console.log('VendorMaster model not available or validation skipped, skipping vendor validation');
      skipVendorValidation = true;
    }
    
    // Determine file type and process accordingly
    const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
    let importResult;

    try {
      // Pass the valid vendor list to the import function only if validation is enabled
      // Now we pass vendor names instead of vendor numbers
      const validVendorList = skipVendorValidation ? [] : validVendorNames;
      console.log(`Passing ${validVendorList.length} valid vendor names to import function`);
      
      if (fileExtension === '.csv') {
        // For CSV files, we don't support patch-only mode yet
        if (patchOnly) {
          return res.status(400).json({
            success: false,
            message: "CSV patching is not supported yet. Please use Excel format."
          });
        }
        importResult = await importBillsFromCSV(tempFilePath, validVendorList);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // For Excel files, pass the patchOnly flag
        importResult = await importBillsFromExcel(tempFilePath, validVendorList, patchOnly);
      } else {
        throw new Error("Unsupported file format");
      }
    } finally {
      // Clean up temp file regardless of success or failure
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Check for non-existent vendors if validation was not skipped
    if (!skipVendorValidation && importResult.nonExistentVendors && importResult.nonExistentVendors.length > 0) {
      const totalVendors = vendorNos.length;
      const invalidVendors = importResult.nonExistentVendors.map(v => v.vendorName || v.vendorNo);
      const uniqueInvalidVendors = [...new Set(invalidVendors)];
      
      return res.status(202).json({  // 202 Accepted - partial processing
        success: true,
        message: "Import completed with warnings - some vendors not found in the vendor master",
        details: {
          inserted: importResult.inserted?.length || 0,
          updated: importResult.updated?.length || 0,
          skipped: importResult.nonExistentVendors.length,
          totalVendors,
          validVendors: validVendorNames.length,
          invalidVendors: uniqueInvalidVendors.length
        },
        nonExistentVendors: uniqueInvalidVendors,
        skippedRows: importResult.nonExistentVendors.map(v => ({
          rowNumber: v.rowNumber,
          srNo: v.srNo, 
          vendorName: v.vendorName || 'Unknown',
          vendorNo: v.vendorNo
        }))
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${importResult.totalProcessed} bills`,
      details: {
        inserted: importResult.inserted?.length || 0,
        updated: importResult.updated?.length || 0,
        total: importResult.totalProcessed,
        vendorValidation: skipVendorValidation ? 'skipped' : 'enabled',
        mode: patchOnly ? 'patch-only' : 'normal'
      },
      data: {
        inserted: importResult.inserted?.map(bill => ({ _id: bill._id, srNo: bill.srNo })) || [],
        updated: importResult.updated?.map(bill => ({ _id: bill._id, srNo: bill.srNo })) || []
      }
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

// Maintain headerMapping here for direct access in patchBillsFromExcel
const headerMapping = {
  "Sr No": "srNo",
  "Sr no Old": "srNoOld",
  "Type of inv": "typeOfInv",
  "Region": "region",
  "Project Description": "projectDescription",
  "Vendor no": "vendorNo",
  "Vendor Name": "vendorName",
  "GST Number": "gstNumber",
  "206AB Compliance": "compliance206AB",
  "PAN Status": "panStatus",
  "If PO created??": "poCreated",
  "PO no": "poNo",
  "PO Dt": "poDate",
  "PO Amt": "poAmt",
  "Proforma Inv No": "proformaInvNo",
  "Proforma Inv Dt": "proformaInvDate",
  "Proforma Inv Amt": "proformaInvAmt",
  "Proforma Inv Recd at site": "proformaInvRecdAtSite",
  "Proforma Inv Recd by": "proformaInvRecdBy",
  "Tax Inv no": "taxInvNo",
  "Tax Inv Dt": "taxInvDate",
  "Currency": "currency",
  "Tax Inv Amt": "taxInvAmt",
  "Tax Inv Amt ": "taxInvAmt",
  "Tax Inv Recd at site": "taxInvRecdAtSite",
  "Tax Inv Recd by": "taxInvRecdBy",
  "Department": "department",
  "Remarks by Site Team": "remarksBySiteTeam",
  "Attachment": "attachment",
  "Attachment Type": "attachmentType",
  "Advance Dt": "advanceDate",
  "Advance Amt": "advanceAmt",
  "Advance Percentage": "advancePercentage",
  "Advance Percentage ": "advancePercentage",
  "Adv request entered by": "advRequestEnteredBy",
  "Dt given to Quality Engineer": "qualityEngineer.dateGiven",
  "Name of Quality Engineer": "qualityEngineer.name",
  "Dt given to QS for Inspection": "qsInspection.dateGiven",
  "Name of QS": "qsInspection.name",
  "Checked by QS with Dt of Measurment": "qsMeasurementCheck.dateGiven",
  "Checked  by QS with Dt of Measurment": "qsMeasurementCheck.dateGiven",
  "Given to vendor-Query/Final Inv": "vendorFinalInv.dateGiven",
  "Dt given to QS for COP": "qsCOP.dateGiven",
  "Name - QS": "qsCOP.name",
  "COP Dt": "copDetails.date",
  "COP Amt": "copDetails.amount",
  "Remarks by QS Team": "remarksByQSTeam",
  "Dt given for MIGO": "migoDetails.dateGiven",
  "MIGO no": "migoDetails.no",
  "MIGO Dt": "migoDetails.date",
  "MIGO Amt": "migoDetails.amount",
  "Migo done by": "migoDetails.doneBy",
  "Dt-Inv returned to Site office": "invReturnedToSite",
  "Dt given to Site Engineer": "siteEngineer.dateGiven",
  "Name of Site Engineer": "siteEngineer.name",
  "Dt given to Architect": "architect.dateGiven",
  "Name of Architect": "architect.name",
  "Dt given-Site Incharge": "siteIncharge.dateGiven",
  "Name-Site Incharge": "siteIncharge.name",
  "Remarks": "remarks",
  "Remarks ": "remarks",
  "Dt given to Site Office for dispatch": "siteOfficeDispatch.dateGiven",
  "Name-Site Office": "siteOfficeDispatch.name",
  "Status": "status"
};

// Function to patch bills from Excel/CSV without creating new records
const patchBillsFromExcel = async (req, res) => {
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
    
    console.log(`Processing file for patch: ${uploadedFile.originalname}`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, uploadedFile.buffer);
    
    // Check if VendorMaster model is available and validate vendors
    const skipVendorValidation = await shouldSkipVendorValidation();
    let validVendorNames = [];
    
    if (!skipVendorValidation && VendorMaster) {
      try {
        // Get all vendors from database and use their names for validation
        const allVendors = await VendorMaster.find().lean();
        validVendorNames = allVendors.map(v => v.vendorName || '');
        console.log(`Found ${validVendorNames.length} valid vendor names for validation`);
        if (validVendorNames.length > 0) {
          console.log(`Sample vendor names: ${validVendorNames.slice(0, 5).join(', ')}${validVendorNames.length > 5 ? '...' : ''}`);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    }
    
    // Use the patchOnly option in importBillsFromExcel to ensure we only update existing bills
    const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
    let importResult;
    
    try {
      if (fileExtension === '.csv') {
        // For now, we don't support CSV directly for patch
        // This could be enhanced in the future
        return res.status(400).json({
          success: false,
          message: "CSV patching is not supported yet. Please use Excel format."
        });
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        importResult = await importBillsFromExcel(tempFilePath, validVendorNames, true);
      } else {
        throw new Error("Unsupported file format");
      }
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully patched ${importResult.updated.length} bills`,
      details: {
        updated: importResult.updated.length,
        skipped: importResult.nonExistentVendors.length,
        total: importResult.totalProcessed
      },
      data: {
        updated: importResult.updated.map(bill => ({ _id: bill._id, srNo: bill.srNo })),
        skipped: importResult.nonExistentVendors
      }
    });
    
  } catch (error) {
    console.error('Patch error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to patch bills",
      error: error.message
    });
  }
};

export default { generateReport, importBills, patchBillsFromExcel };