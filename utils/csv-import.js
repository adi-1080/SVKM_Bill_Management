import fs from 'fs';
import { Parser } from 'json2csv';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import Bill from "../models/bill-model.js";
import mongoose from "mongoose";
import PanStatusMaster from "../models/pan-status-master-model.js";
import CurrencyMaster from "../models/currency-master-model.js";
import RegionMaster from "../models/region-master-model.js";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import VendorMaster from "../models/vendor-master-model.js";
import ComplianceMaster from "../models/compliance-master-model.js";

// Import helper functions from csv-patch.js
import {
  unflattenData,
  parseDate,
  parseAmount,
  organizeQSFields,
  convertTypes,
  validateRequiredFields,
  mergeWithExisting,
  convertExcelSrNo,
  generateUniqueSerialNumber,
  findNextAvailableSrNo,
  headerMapping,
  contextBasedMapping,
  serialNumberTracking
} from './csv-patch.js';

// Helper function to find existing bills by srNo or excelSrNo
async function findExistingBills(srNosToCheck) {
  if (!srNosToCheck || !srNosToCheck.length) return {};
  
  // Find bills that match either the srNo or excelSrNo fields
  const existingBills = await Bill.find({
    $or: [
      { srNo: { $in: srNosToCheck } },
      { excelSrNo: { $in: srNosToCheck } }
    ]
  }).lean();
  
  // Create a lookup map by both srNo and excelSrNo for quick access
  const billsByIdentifier = {};
  
  existingBills.forEach(bill => {
    // Index by srNo
    if (bill.srNo) {
      billsByIdentifier[bill.srNo] = bill;
    }
    
    // Also index by excelSrNo if it exists and is different from srNo
    if (bill.excelSrNo && bill.excelSrNo !== bill.srNo) {
      billsByIdentifier[bill.excelSrNo] = bill;
    }
  });
  
  return billsByIdentifier;
}

// Import bills from a CSV file and load data into the model
export const importBillsFromCSV = async (filePath, validVendorNos = []) => {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rows = fileContent.split('\n');
    
    // Get headers from the second line (skip the numbering row)
    const headers = rows[1].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    
    // Process data rows
    const toInsert = [];
    const nonExistentVendors = [];
    
    for (let i = 2; i < rows.length; i++) {
      // Skip empty rows
      if (!rows[i].trim()) continue;
      
      const rowData = {};
      const cells = rows[i].split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
      
      if (cells[0] === '') continue; // Skip if first cell is empty
      
      // Map values to fields
      headers.forEach((header, index) => {
        if (index < cells.length) {
          const fieldName = headerMapping[header] || header;
          rowData[fieldName] = cells[index];
          
          // Special handling for region to preserve case information for validation
          if (fieldName === 'region' && cells[index]) {
            rowData.regionOriginal = cells[index].trim();
          }
        }
      });

      // Check if vendor exists
      const vendorNo = rowData.vendorNo;
      const vendorName = rowData.vendorName;
      const srNo = rowData.srNo;
      
      // Check if vendor name exists in the list of valid vendors
      if (vendorName && validVendorNos.length > 0 && !validVendorNos.some(vendor => 
        vendorName.toLowerCase().includes(vendor.toLowerCase()) || 
        vendor.toLowerCase().includes(vendorName.toLowerCase()))
      ) {
        nonExistentVendors.push({ srNo, vendorNo, vendorName, rowNumber: i });
        continue; // Skip this row
      }
      
      // Add default fields needed for MongoDB
      rowData.billDate = rowData.taxInvDate || new Date().toISOString().split('T')[0];
      rowData.amount = rowData.taxInvAmt || 0;
      
      // Find vendor from VendorMaster
      try {
        if (vendorName) {
          const vendorDoc = await VendorMaster.findOne({
            vendorName: { $regex: new RegExp(vendorName, 'i') }
          });
          
          if (vendorDoc) {
            rowData.vendor = vendorDoc._id;
          } else {
            rowData.vendor = new mongoose.Types.ObjectId();
          }
        } else {
          rowData.vendor = new mongoose.Types.ObjectId();
        }
      } catch (error) {
        console.error('Error finding vendor:', error);
        rowData.vendor = new mongoose.Types.ObjectId();
      }

      // Map PAN Status to PanStatusMaster
      if (rowData.panStatus) {
        try {
          let panStatusDoc = null;
          if (typeof rowData.panStatus === "string") {
            panStatusDoc = await PanStatusMaster.findOne({ 
              name: { $regex: new RegExp(rowData.panStatus, 'i') } 
            });
          } else if (typeof rowData.panStatus === "object" && rowData.panStatus._id) {
            panStatusDoc = await PanStatusMaster.findById(rowData.panStatus._id);
          }
          rowData.panStatus = panStatusDoc ? panStatusDoc._id : null;
        } catch (error) {
          console.error('Error finding PAN status:', error);
          rowData.panStatus = null;
        }
      }
      
      // Map region to RegionMaster
      if (rowData.region) {
        try {
          const regionDoc = await RegionMaster.findOne({ 
            name: { $regex: new RegExp(rowData.region, 'i') } 
          });
          
          if (regionDoc) {
            rowData.region = regionDoc.name;
          } else {
            // Default to the first region found
            const defaultRegion = await RegionMaster.findOne();
            if (defaultRegion) {
              rowData.region = defaultRegion.name;
            } else {
              // If no region exists, skip this bill to prevent validation error
              nonExistentVendors.push({ 
                srNo, 
                vendorNo, 
                vendorName, 
                rowNumber: i,
                reason: 'No valid region available in RegionMaster'
              });
              continue; // Skip this row
            }
          }
        } catch (error) {
          console.error('Error finding region:', error);
          // Default to the first region found to avoid validation errors
          try {
            const defaultRegion = await RegionMaster.findOne();
            if (defaultRegion) {
              rowData.region = defaultRegion.name;
            } else {
              // If no region exists, skip this bill
              nonExistentVendors.push({ 
                srNo, 
                vendorNo, 
                vendorName, 
                rowNumber: i,
                reason: 'No valid region available in RegionMaster'
              });
              continue; // Skip this row
            }
          } catch (err) {
            nonExistentVendors.push({ 
              srNo, 
              vendorNo, 
              vendorName, 
              rowNumber: i,
              reason: 'Error finding region: ' + err.message
            });
            continue; // Skip this row
          }
        }
      } else {
        try {
          // Default to any available region
          const defaultRegion = await RegionMaster.findOne();
          if (defaultRegion) {
            rowData.region = defaultRegion.name;
          } else {
            // If no region exists, skip this bill
            nonExistentVendors.push({ 
              srNo, 
              vendorNo, 
              vendorName, 
              rowNumber: i,
              reason: 'No valid region available in RegionMaster'
            });
            continue; // Skip this row
          }
        } catch (error) {
          console.error('Error finding default region:', error);
          nonExistentVendors.push({ 
            srNo, 
            vendorNo, 
            vendorName, 
            rowNumber: i,
            reason: 'Error finding default region: ' + error.message
          });
          continue; // Skip this row
        }
      }
      
      // Map currency to CurrencyMaster
      if (rowData.currency) {
        try {
          const currencyDoc = await CurrencyMaster.findOne({ 
            currency: { $regex: new RegExp(rowData.currency, 'i') } 
          });
          
          if (currencyDoc) {
            rowData.currency = currencyDoc._id;
          } else {
            // Default to INR or the first currency found
            const defaultCurrency = await CurrencyMaster.findOne({ 
              currency: { $regex: /inr/i } 
            }) || await CurrencyMaster.findOne();
            
            rowData.currency = defaultCurrency ? defaultCurrency._id : new mongoose.Types.ObjectId();
          }
        } catch (error) {
          console.error('Error finding currency:', error);
          rowData.currency = new mongoose.Types.ObjectId();
        }
      } else {
        try {
          // Default to INR or any available currency
          const defaultCurrency = await CurrencyMaster.findOne({ 
            currency: { $regex: /inr/i } 
          }) || await CurrencyMaster.findOne();
          
          rowData.currency = defaultCurrency ? defaultCurrency._id : new mongoose.Types.ObjectId();
        } catch (error) {
          console.error('Error finding default currency:', error);
          rowData.currency = new mongoose.Types.ObjectId();
        }
      }
      
      // Map natureOfWork/typeOfInv to NatureOfWorkMaster
      const workType = rowData.natureOfWork || rowData.typeOfInv || "Others";
      try {
        const workDoc = await NatureOfWorkMaster.findOne({ 
          natureOfWork: { $regex: new RegExp(workType, 'i') } 
        });
        
        if (workDoc) {
          rowData.natureOfWork = workDoc._id;
        } else {
          // Default to "Others" or the first type found
          const defaultWork = await NatureOfWorkMaster.findOne({ 
            natureOfWork: { $regex: /others/i } 
          }) || await NatureOfWorkMaster.findOne();
          
          rowData.natureOfWork = defaultWork ? defaultWork._id : new mongoose.Types.ObjectId();
        }
      } catch (error) {
        console.error('Error finding nature of work:', error);
        rowData.natureOfWork = new mongoose.Types.ObjectId();
      }

      // Set defaults for required fields
      if (!rowData.siteStatus) {
        rowData.siteStatus = "hold";
      }
      
      if (!rowData.department) {
        rowData.department = "DEFAULT DEPT";
      }
      
      if (!rowData.taxInvRecdBy) {
        rowData.taxInvRecdBy = "SYSTEM IMPORT";
      }
      
      if (!rowData.taxInvRecdAtSite) {
        rowData.taxInvRecdAtSite = new Date();
      }
      
      if (!rowData.projectDescription) {
        rowData.projectDescription = "N/A";
      }

      // Convert types
      const typedData = convertTypes(rowData);
      const validatedData = validateRequiredFields(typedData);
      const processedData = unflattenData(validatedData);
      
      toInsert.push(processedData);
    }
    
    // Insert into database
    let inserted = [];
    if (toInsert.length > 0) {
      inserted = await Bill.insertMany(toInsert, { validateBeforeSave: false });
    }
    
    return {
      inserted,
      nonExistentVendors,
      totalProcessed: inserted.length,
      totalSkipped: nonExistentVendors.length
    };
    
  } catch (error) {
    console.error('CSV import error:', error);
    throw error;
  }
};

// Update importBillsFromExcel function to use the enhanced serial number generation
export const importBillsFromExcel = async (filePath, validVendorNos = [], patchOnly = false) => {
  try {
    // Reset serial number tracking at the beginning of each import session
    serialNumberTracking.lastPrefixUsed = null;
    serialNumberTracking.lastNumberUsed = 0;
    serialNumberTracking.usedSerialNumbers.clear();
    
    // Track items that are skipped because they already exist
    const alreadyExistingBills = [];
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error("No worksheet found in the Excel file");
    }
    
    // Get headers from the second row (first row might be column numbers)
    const firstRowValues = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, cell => {
      firstRowValues.push(cell.value?.toString().trim());
    });
    
    // Determine if first row is headers or column numbers
    const isFirstRowNumbers = firstRowValues.every(val => !isNaN(parseInt(val)));
    const headerRowIndex = isFirstRowNumbers ? 2 : 1;
    
    // Get headers
    const headers = [];
    const headerPositions = {}; // Store position of each header for context-based mapping
    
    worksheet.getRow(headerRowIndex).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerText = cell.value?.toString().trim();
      headers[colNumber - 1] = headerText;
      headerPositions[headerText] = colNumber - 1;
    });
    
    // Prepare for context-based mapping
    // Create a map from column position to the field it should map to based on surrounding columns
    const positionToFieldMap = {};
    
    // Identify "Name of QS" fields based on their preceding headers
    for (const [contextHeader, config] of Object.entries(contextBasedMapping)) {
      if (headerPositions[contextHeader] !== undefined) {
        const contextPosition = headerPositions[contextHeader];
        // Find the next field (usually right after the context field)
        const nextPosition = contextPosition + 1;
        if (headers[nextPosition] === config.nextField) {
          positionToFieldMap[nextPosition] = config.mapping;
        }
      }
    }
    
    // Process data rows
    const toInsert = [];
    const toUpdate = [];
    const nonExistentVendors = [];
    const startRowIndex = headerRowIndex + 1;
    
    // Helper function to standardize date format
    const formatDate = (date) => {
      if (!date) return null;
      if (typeof date === 'string') {
        return parseDate(date);
      }
      if (date instanceof Date) {
        // Ensure we return a proper Date object
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      }
      return null;
    };
    
    // Helper function to process date fields in an object
    const processDateFields = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const dateFields = [
        'billDate', 'poDate', 'proformaInvDate', 'proformaInvRecdAtSite', 
        'taxInvDate', 'taxInvRecdAtSite', 'advanceDate'
      ];
      
      // Process top-level date fields
      for (const field of dateFields) {
        if (obj[field]) {
          obj[field] = formatDate(obj[field]);
        }
      }
      
      // Process nested date fields
      if (obj.accountsDept) {
        const accountsDateFields = [
          'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
          'paymentDate', 'invBookingChecking'
        ];
        
        for (const field of accountsDateFields) {
          if (obj.accountsDept[field]) {
            obj.accountsDept[field] = formatDate(obj.accountsDept[field]);
          }
        }
      }
      
      // Process other nested objects with dates
      const nestedObjects = [
        'qualityEngineer', 'qsInspection', 'qsMeasurementCheck', 'vendorFinalInv', 
        'qsCOP', 'siteEngineer', 'architect', 'siteIncharge', 'siteOfficeDispatch',
        'qsMumbai', 'pimoMumbai', 'itDept', 'copDetails', 'migoDetails', 'sesDetails'
      ];
      
      for (const nestedField of nestedObjects) {
        if (obj[nestedField]) {
          if (obj[nestedField].dateGiven) {
            obj[nestedField].dateGiven = formatDate(obj[nestedField].dateGiven);
          }
          if (obj[nestedField].dateReceived) {
            obj[nestedField].dateReceived = formatDate(obj[nestedField].dateReceived);
          }
          if (obj[nestedField].date) {
            obj[nestedField].date = formatDate(obj[nestedField].date);
          }
        }
      }
      
      // Special handling for approval details
      if (obj.approvalDetails && obj.approvalDetails.directorApproval) {
        if (obj.approvalDetails.directorApproval.dateGiven) {
          obj.approvalDetails.directorApproval.dateGiven = formatDate(obj.approvalDetails.directorApproval.dateGiven);
        }
        if (obj.approvalDetails.directorApproval.dateReceived) {
          obj.approvalDetails.directorApproval.dateReceived = formatDate(obj.approvalDetails.directorApproval.dateReceived);
        }
      }
      
      return obj;
    };
    
    // First, collect all sr numbers to check against DB
    const srNosInExcel = [];
    for (let rowNumber = startRowIndex; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const srNoCell = row.getCell(1); // Assuming Sr No is in the first column
      
      if (srNoCell.value) {
        srNosInExcel.push(String(srNoCell.value).trim());
      }
    }
    
    // Query DB to find existing bills with these sr numbers - check both srNo and excelSrNo fields
    const existingBillsMap = await findExistingBills(srNosInExcel);
    const existingBillKeys = Object.keys(existingBillsMap);
    
    // Keep track of used srNos within this import batch to avoid duplicates
    const usedSrNos = new Set();
    
    // Pre-fetch master data to avoid repeated queries
    const regionMasters = await RegionMaster.find().lean();
    const currencyMasters = await CurrencyMaster.find().lean();
    const natureMasters = await NatureOfWorkMaster.find().lean();
    const panStatusMasters = await PanStatusMaster.find().lean();
    const vendorMasters = await VendorMaster.find().lean();
    
    // Find default values for required fields
    const defaultRegion = regionMasters.length > 0 ? regionMasters[0] : null;
    const defaultCurrency = currencyMasters.find(c => c.currency?.toLowerCase() === "inr") || 
                          (currencyMasters.length > 0 ? currencyMasters[0] : null);
    const defaultNature = natureMasters.find(n => n.natureOfWork?.toLowerCase() === "others") || 
                        (natureMasters.length > 0 ? natureMasters[0] : null);
    
    // Validate essential master data exists
    if (!defaultRegion) {
      throw new Error("No regions found in RegionMaster. Please add at least one region before importing.");
    }

    if (!defaultCurrency) {
      throw new Error("No currencies found in CurrencyMaster. Please add at least one currency before importing.");
    }

    if (!defaultNature) {
      throw new Error("No nature of work entries found in NatureOfWorkMaster. Please add at least one entry before importing.");
    }
    
    for (let rowNumber = startRowIndex; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rawRowData = {};
      
      // Skip empty rows or rows with no value in first cell
      if (!row.getCell(1).value) continue;
      
      let isEmpty = true;
      let srNo = null;
      let vendorNo = null;
      let vendorName = null;
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        isEmpty = false;
        const columnIndex = colNumber - 1;
        const header = headers[columnIndex];
        if (!header) return; // Skip cells with no header
        
        // Determine field mapping - first check context-based mapping
        let fieldName;
        if (positionToFieldMap[columnIndex]) {
          fieldName = positionToFieldMap[columnIndex];
        } else {
          fieldName = headerMapping[header] || header;
        }
        
        // Skip duplicate Status field mappings (only use the one for the correct context)
        if (fieldName === "status" && header === "Status" && 
            columnIndex !== headerPositions["Status"]) {
          // This is likely the payment status, not the bill status
          fieldName = "accountsDept.status";
        }
        
        let value = cell.value;
        
        // Store srNo for lookup
        if (fieldName === 'srNo') {
          srNo = String(value || '').trim();
        }
        
        // Store vendorNo for reference
        if (fieldName === 'vendorNo') {
          vendorNo = String(value || '').trim();
        }
        
        // Store vendorName for validation
        if (fieldName === 'vendorName') {
          vendorName = String(value || '').trim();
        }
        
        // Handle different cell types
        if (cell.type === ExcelJS.ValueType.Date) {
          value = cell.value; // Keep as Date object
        } else if (typeof value === 'object' && value !== null) {
          value = value.text || value.result || value.toString();
        }
        
        // For date fields that might come as strings, parse them properly
        if (fieldName && fieldName.toLowerCase().includes('date')) {
          value = parseDate(value);
        }
        
        // Don't skip null/empty values - include them in the record
        rawRowData[fieldName] = value;
      });
      
      if (!isEmpty && srNo) {
        try {
          // Create a deep copy of the rowData to avoid reference issues
          const rowData = JSON.parse(JSON.stringify(rawRowData));
          
          // Store original Excel serial number as srNoOld
          rowData.srNoOld = srNo;
          rowData.excelSrNo = srNo;
          
          // Check if this bill already exists in the database with either the same srNo or excelSrNo
          const existingBill = existingBillsMap[srNo];
          
          if (existingBill) {
            // If we're in patchOnly mode, add to update queue instead of skipping
            if (patchOnly) {
              // MODIFIED: Apply vendor name validation before proceeding with update
              if (vendorName && validVendorNos.length > 0) {
                const isValidVendor = validVendorNos.some(validVendor => 
                  vendorName.toLowerCase().includes(validVendor.toLowerCase()) || 
                  validVendor.toLowerCase().includes(vendorName.toLowerCase())
                );
                
                if (!isValidVendor) {
                  nonExistentVendors.push({ 
                    srNo, 
                    vendorNo, 
                    vendorName, 
                    rowNumber,
                    reason: 'Vendor not found in database'
                  });
                  continue; // Skip this row
                }
              }
              
              // Processing for update when bill exists
              // Add default fields needed for MongoDB
              rowData.srNo = existingBill.srNo; // Keep existing srNo
              rowData.billDate = rowData.taxInvDate || existingBill.billDate || new Date();
              rowData.amount = rowData.taxInvAmt || existingBill.amount || 0;
              rowData.vendor = existingBill.vendor; // Keep existing vendor reference
              
              // Special handling for accountsDept.returnedToPimo before convertTypes
              if (rowData.accountsDept && rowData.accountsDept.returnedToPimo) {
                if (typeof rowData.accountsDept.returnedToPimo === 'string') {
                  try {
                    // Parse the date from string format DD-MM-YYYY
                    const dateParts = rowData.accountsDept.returnedToPimo.split('-');
                    if (dateParts.length === 3) {
                      const [day, month, year] = dateParts;
                      const parsedDate = new Date(
                        parseInt(year, 10),
                        parseInt(month, 10) - 1,
                        parseInt(day, 10)
                      );
                      
                      if (!isNaN(parsedDate.getTime())) {
                        rowData.accountsDept.returnedToPimo = parsedDate;
                      } else {
                        rowData.accountsDept.returnedToPimo = null;
                      }
                    } else {
                      rowData.accountsDept.returnedToPimo = null;
                    }
                  } catch (error) {
                    console.error(`Error processing returnedToPimo: ${error.message}`);
                    rowData.accountsDept.returnedToPimo = null;
                  }
                }
              }
              
              // Set required fields from existing bill if not present in the update
              if (!rowData.vendorName) rowData.vendorName = existingBill.vendorName || "Unknown Vendor";
              if (!rowData.vendorNo) rowData.vendorNo = existingBill.vendorNo || "Unknown";
              if (!rowData.projectDescription) rowData.projectDescription = existingBill.projectDescription || "N/A";
              if (!rowData.poCreated) rowData.poCreated = existingBill.poCreated || "No";
              if (!rowData.siteStatus) rowData.siteStatus = existingBill.siteStatus || "hold";
              if (!rowData.department) rowData.department = existingBill.department || "DEFAULT DEPT";
              if (!rowData.taxInvRecdBy) rowData.taxInvRecdBy = existingBill.taxInvRecdBy || "SYSTEM IMPORT";
              if (!rowData.taxInvRecdAtSite) rowData.taxInvRecdAtSite = existingBill.taxInvRecdAtSite || new Date();

              // Handle PAN Status
              if (rowData.panStatus) {
                try {
                  let panStatusDoc = null;
                  if (typeof rowData.panStatus === "string") {
                    panStatusDoc = panStatusMasters.find(p => 
                      p.name && p.name.toLowerCase() === rowData.panStatus.toLowerCase()
                    );
                  } else if (typeof rowData.panStatus === "object" && rowData.panStatus._id) {
                    panStatusDoc = panStatusMasters.find(p => p._id.toString() === rowData.panStatus._id.toString());
                  }
                  rowData.panStatus = panStatusDoc ? panStatusDoc._id : existingBill.panStatus || null;
                } catch (error) {
                  console.error('Error finding PAN status:', error);
                  rowData.panStatus = existingBill.panStatus || null;
                }
              } else {
                rowData.panStatus = existingBill.panStatus || null;
              }
              
              // Handle Region
              let regionName = null;
              if (rowData.region) {
                // Try to find a matching region (case-insensitive)
                const regionDoc = regionMasters.find(r =>
                  r.name && r.name.toLowerCase() === rowData.region.toLowerCase()
                );
                regionName = regionDoc ? regionDoc.name : null;
              }
              // Do not fallback: if region is not found, skip this row and log as error
              if (!regionName) {
                nonExistentVendors.push({ srNo, vendorNo, vendorName, rowNumber, reason: 'Region not found in RegionMaster' });
                continue;
              }
              rowData.region = regionName;
              
              // Handle Currency
              if (rowData.currency) {
                try {
                  const currencyDoc = currencyMasters.find(c => 
                    c.currency && c.currency.toLowerCase() === rowData.currency.toLowerCase()
                  );
                  rowData.currency = currencyDoc ? currencyDoc._id : existingBill.currency;
                } catch (error) {
                  console.error('Error finding currency:', error);
                  rowData.currency = existingBill.currency;
                }
              } else {
                rowData.currency = existingBill.currency;
              }
              
              // Handle Nature of Work
              const workType = rowData.natureOfWork || rowData.typeOfInv;
              if (workType) {
                try {
                  const workDoc = natureMasters.find(n => 
                    n.natureOfWork && n.natureOfWork.toLowerCase() === workType.toLowerCase()
                  );
                  rowData.natureOfWork = workDoc ? workDoc._id : existingBill.natureOfWork;
                } catch (error) {
                  console.error('Error finding nature of work:', error);
                  rowData.natureOfWork = existingBill.natureOfWork;
                }
              } else {
                rowData.natureOfWork = existingBill.natureOfWork;
              }
              
              // Process and validate data
              const typedData = convertTypes(rowData);
              
              // Special handling for compliance206AB field - ensure it's set as an ObjectId reference
              try {
                if (typedData.compliance206AB && typeof typedData.compliance206AB === 'string') {
                  const complianceDoc = await ComplianceMaster.findOne({
                    compliance206AB: { $regex: new RegExp(typedData.compliance206AB, 'i') }
                  });
                  
                  if (complianceDoc) {
                    typedData.compliance206AB = complianceDoc._id;
                  } else {
                    // If not found, use a default compliance record
                    const defaultCompliance = await ComplianceMaster.findOne();
                    typedData.compliance206AB = defaultCompliance ? defaultCompliance._id : null;
                  }
                }
              } catch (error) {
                // If there's an error looking up the compliance, set to null
                typedData.compliance206AB = null;
              }
              
              const validatedData = await validateRequiredFields(typedData);
              
              // Final safety check for all date fields in accountsDept
              if (validatedData.accountsDept) {
                const dateFields = [
                  'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
                  'paymentDate'
                ];
                
                dateFields.forEach(field => {
                  if (validatedData.accountsDept[field] && 
                      typeof validatedData.accountsDept[field] === 'string') {
                    validatedData.accountsDept[field] = null; // Safer to set to null than keep as string
                  }
                });
              }
              
              // Process date fields to ensure consistent format
              processDateFields(validatedData);
              
              // Merge data with existing bill data - the mergeWithExisting function 
              // already implements the "don't overwrite non-null with null" logic
              const mergedData = mergeWithExisting(existingBill, validatedData);
              
              // Unflatten the merged data
              const unflattenedData = unflattenData(mergedData);
              
              // Process date fields in the unflattened data
              processDateFields(unflattenedData);
              
              // Ensure all required fields are present in the update
              if (!unflattenedData.srNo) unflattenedData.srNo = existingBill.srNo;
              if (!unflattenedData.region) unflattenedData.region = existingBill.region || defaultRegion.name;
              if (!unflattenedData.currency) unflattenedData.currency = existingBill.currency || defaultCurrency._id;
              if (!unflattenedData.natureOfWork) unflattenedData.natureOfWork = existingBill.natureOfWork || defaultNature._id;
              if (!unflattenedData.vendor) unflattenedData.vendor = existingBill.vendor || new mongoose.Types.ObjectId();
              if (!unflattenedData.billDate) unflattenedData.billDate = existingBill.billDate || new Date();
              if (!unflattenedData.amount) unflattenedData.amount = existingBill.amount || 0;
              if (!unflattenedData.vendorName) unflattenedData.vendorName = existingBill.vendorName || "Unknown Vendor";
              if (!unflattenedData.vendorNo) unflattenedData.vendorNo = existingBill.vendorNo || "Unknown";
              if (!unflattenedData.projectDescription) unflattenedData.projectDescription = existingBill.projectDescription || "N/A";
              if (!unflattenedData.poCreated) unflattenedData.poCreated = existingBill.poCreated || "No";
              if (!unflattenedData.siteStatus) unflattenedData.siteStatus = existingBill.siteStatus || "hold";
              if (!unflattenedData.department) unflattenedData.department = existingBill.department || "DEFAULT DEPT";
              if (!unflattenedData.taxInvRecdBy) unflattenedData.taxInvRecdBy = existingBill.taxInvRecdBy || "SYSTEM IMPORT";
              if (!unflattenedData.taxInvRecdAtSite) unflattenedData.taxInvRecdAtSite = existingBill.taxInvRecdAtSite || new Date();
              
              // Helper function to ensure valid ObjectId
              const ensureValidObjectId = (value, defaultValue) => {
                try {
                  if (!value) return defaultValue;
                  if (value instanceof mongoose.Types.ObjectId) return value;
                  if (typeof value === 'string') return new mongoose.Types.ObjectId(value);
                  return defaultValue;
                } catch (error) {
                  console.error('Error converting to ObjectId:', error);
                  return defaultValue;
                }
              };

              // Ensure all master table references are valid ObjectIds
              // Currency
              unflattenedData.currency = ensureValidObjectId(unflattenedData.currency, defaultCurrency._id);

              // Nature of Work
              unflattenedData.natureOfWork = ensureValidObjectId(unflattenedData.natureOfWork, defaultNature._id);

              // Vendor
              unflattenedData.vendor = ensureValidObjectId(unflattenedData.vendor, new mongoose.Types.ObjectId());

              // PAN Status
              if (unflattenedData.panStatus) {
                try {
                  const panStatusDoc = panStatusMasters.find(p => 
                    p.name && p.name.toLowerCase() === unflattenedData.panStatus.toLowerCase()
                  );
                  unflattenedData.panStatus = panStatusDoc ? panStatusDoc._id : existingBill.panStatus;
                } catch (error) {
                  console.error('Error finding PAN status:', error);
                  unflattenedData.panStatus = existingBill.panStatus;
                }
              } else {
                unflattenedData.panStatus = existingBill.panStatus;
              }

              // Compliance 206AB
              if (unflattenedData.compliance206AB) {
                try {
                  const complianceDoc = await ComplianceMaster.findOne({
                    compliance206AB: { $regex: new RegExp(unflattenedData.compliance206AB, 'i') }
                  });
                  unflattenedData.compliance206AB = complianceDoc ? complianceDoc._id : existingBill.compliance206AB;
                } catch (error) {
                  console.error('Error finding compliance:', error);
                  unflattenedData.compliance206AB = existingBill.compliance206AB;
                }
              } else {
                unflattenedData.compliance206AB = existingBill.compliance206AB;
              }

              // Region (special case - stored as name, not ObjectId)
              if (unflattenedData.region) {
                try {
                  const regionDoc = regionMasters.find(r =>
                    r.name && r.name.toLowerCase() === unflattenedData.region.toLowerCase()
                  );
                  unflattenedData.region = regionDoc ? regionDoc.name : existingBill.region || defaultRegion.name;
                } catch (error) {
                  console.error('Error finding region:', error);
                  unflattenedData.region = existingBill.region || defaultRegion.name;
                }
              } else {
                unflattenedData.region = existingBill.region || defaultRegion.name;
              }
              
              toUpdate.push({ 
                _id: existingBill._id, 
                data: unflattenedData
              });
              
              // Track this as an already existing bill that's now queued for update
              alreadyExistingBills.push({
                srNo: srNo,
                _id: existingBill._id,
                vendorName: vendorName,
                rowNumber,
                updating: true
              });
              
              continue; // Skip the rest of this iteration and go to the next row
            } else {
              // In normal import mode, just track as existing and skip
              alreadyExistingBills.push({
                srNo: srNo,
                _id: existingBill._id,
                vendorName: vendorName,
                rowNumber
              });
              continue; // Skip this row
            }
          }
          
          // Process new bill
          // Convert Excel serial number to new format with our prefix
          const convertedSrNo = convertExcelSrNo(srNo);
          
          // Now generate a unique serial number to avoid conflicts
          const uniqueSrNo = await generateUniqueSerialNumber('25');
          
          // Store original and new serial numbers for reference
          rowData.srNoOld = srNo;
          rowData.excelSrNo = srNo;
          rowData.srNo = uniqueSrNo;
          
          // Set required fields
          rowData.billDate = rowData.taxInvDate || new Date();
          rowData.amount = rowData.taxInvAmt || 0;
          
          // Find vendor from VendorMaster
          try {
            if (vendorName) {
              const vendorDoc = vendorMasters.find(v => 
                v.vendorName && v.vendorName.toLowerCase().includes(vendorName.toLowerCase())
              );
              
              if (vendorDoc) {
                rowData.vendor = vendorDoc._id;
              } else {
                // Try by vendor number if vendorName didn't work
                const vendorByNum = vendorMasters.find(v => v.vendorNo === vendorNo);
                rowData.vendor = vendorByNum ? vendorByNum._id : new mongoose.Types.ObjectId();
              }
            } else {
              rowData.vendor = new mongoose.Types.ObjectId();
            }
          } catch (error) {
            rowData.vendor = new mongoose.Types.ObjectId();
          }
          
          // Handle PAN Status
          if (rowData.panStatus) {
            try {
              let panStatusDoc = null;
              if (typeof rowData.panStatus === "string") {
                panStatusDoc = panStatusMasters.find(p => 
                  p.name && p.name.toLowerCase() === rowData.panStatus.toLowerCase()
                );
              } else if (typeof rowData.panStatus === "object" && rowData.panStatus._id) {
                panStatusDoc = panStatusMasters.find(p => p._id.toString() === rowData.panStatus._id.toString());
              }
              rowData.panStatus = panStatusDoc ? panStatusDoc._id : null;
            } catch (error) {
              rowData.panStatus = null;
            }
          }
          
          // Handle Region
          let regionName = null;
          if (rowData.region) {
            // Try to find a matching region (case-insensitive)
            const regionDoc = regionMasters.find(r =>
              r.name && r.name.toLowerCase() === rowData.region.toLowerCase()
            );
            regionName = regionDoc ? regionDoc.name : null;
          }
          // Do not fallback: if region is not found, skip this row and log as error
          if (!regionName) {
            nonExistentVendors.push({ srNo, vendorNo, vendorName, rowNumber, reason: 'Region not found in RegionMaster' });
            continue;
          }
          rowData.region = regionName;
          
          // Handle Currency
          if (rowData.currency) {
            try {
              const currencyDoc = currencyMasters.find(c => 
                c.currency && c.currency.toLowerCase() === rowData.currency.toLowerCase()
              );
              rowData.currency = currencyDoc ? currencyDoc._id : defaultCurrency._id;
            } catch (error) {
              rowData.currency = defaultCurrency._id;
            }
          } else {
            rowData.currency = defaultCurrency._id;
          }
          
          // Handle Nature of Work
          const workType = rowData.natureOfWork || rowData.typeOfInv;
          if (workType) {
            try {
              const workDoc = natureMasters.find(n => 
                n.natureOfWork && n.natureOfWork.toLowerCase() === workType.toLowerCase()
              );
              rowData.natureOfWork = workDoc ? workDoc._id : defaultNature._id;
            } catch (error) {
              rowData.natureOfWork = defaultNature._id;
            }
          } else {
            rowData.natureOfWork = defaultNature._id;
          }
          
          // Process and validate data
          const typedData = convertTypes(rowData);
          
          // Special handling for compliance206AB field - ensure it's set as an ObjectId reference
          try {
            if (typedData.compliance206AB && typeof typedData.compliance206AB === 'string') {
              const complianceDoc = await ComplianceMaster.findOne({
                compliance206AB: { $regex: new RegExp(typedData.compliance206AB, 'i') }
              });
              
              if (complianceDoc) {
                typedData.compliance206AB = complianceDoc._id;
              } else {
                // If not found, use a default compliance record
                const defaultCompliance = await ComplianceMaster.findOne();
                typedData.compliance206AB = defaultCompliance ? defaultCompliance._id : null;
              }
            }
          } catch (error) {
            // If there's an error looking up the compliance, set to null
            typedData.compliance206AB = null;
          }
          
          const validatedData = await validateRequiredFields(typedData);
          
          // Final safety check for all date fields in accountsDept
          if (validatedData.accountsDept) {
            const dateFields = [
              'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
              'paymentDate'
            ];
            
            dateFields.forEach(field => {
              if (validatedData.accountsDept[field] && 
                  typeof validatedData.accountsDept[field] === 'string') {
                validatedData.accountsDept[field] = null; // Safer to set to null than keep as string
              }
            });
          }
          
          // Process date fields to ensure consistent format
          processDateFields(validatedData);
          
          // Check if this is an update or new insert
          if (existingBillKeys.includes(Number(srNo))) {
            const existingBill = existingBillsMap[Number(srNo)];
            
            // Merge data - don't overwrite non-null DB values with null Excel values
            const mergedData = mergeWithExisting(existingBill, validatedData);
            
            // Unflatten the merged data
            const unflattenedData = unflattenData(mergedData);
            
            // Process date fields in the unflattened data
            processDateFields(unflattenedData);
            
            // Ensure all required fields are present in the update
            if (!unflattenedData.srNo) unflattenedData.srNo = existingBill.srNo;
            if (!unflattenedData.region) unflattenedData.region = existingBill.region || defaultRegion.name;
            if (!unflattenedData.currency) unflattenedData.currency = existingBill.currency || defaultCurrency._id;
            if (!unflattenedData.natureOfWork) unflattenedData.natureOfWork = existingBill.natureOfWork || defaultNature._id;
            if (!unflattenedData.vendor) unflattenedData.vendor = existingBill.vendor || new mongoose.Types.ObjectId();
            if (!unflattenedData.billDate) unflattenedData.billDate = existingBill.billDate || new Date();
            if (!unflattenedData.amount) unflattenedData.amount = existingBill.amount || 0;
            if (!unflattenedData.vendorName) unflattenedData.vendorName = existingBill.vendorName || "Unknown Vendor";
            if (!unflattenedData.vendorNo) unflattenedData.vendorNo = existingBill.vendorNo || "Unknown";
            if (!unflattenedData.projectDescription) unflattenedData.projectDescription = existingBill.projectDescription || "N/A";
            if (!unflattenedData.poCreated) unflattenedData.poCreated = existingBill.poCreated || "No";
            if (!unflattenedData.siteStatus) unflattenedData.siteStatus = existingBill.siteStatus || "hold";
            if (!unflattenedData.department) unflattenedData.department = existingBill.department || "DEFAULT DEPT";
            if (!unflattenedData.taxInvRecdBy) unflattenedData.taxInvRecdBy = existingBill.taxInvRecdBy || "SYSTEM IMPORT";
            if (!unflattenedData.taxInvRecdAtSite) unflattenedData.taxInvRecdAtSite = existingBill.taxInvRecdAtSite || new Date();
            
            // Helper function to ensure valid ObjectId
            const ensureValidObjectId = (value, defaultValue) => {
              try {
                if (!value) return defaultValue;
                if (value instanceof mongoose.Types.ObjectId) return value;
                if (typeof value === 'string') return new mongoose.Types.ObjectId(value);
                return defaultValue;
              } catch (error) {
                console.error('Error converting to ObjectId:', error);
                return defaultValue;
              }
            };

            // Ensure all master table references are valid ObjectIds
            // Currency
            unflattenedData.currency = ensureValidObjectId(unflattenedData.currency, defaultCurrency._id);

            // Nature of Work
            unflattenedData.natureOfWork = ensureValidObjectId(unflattenedData.natureOfWork, defaultNature._id);

            // Vendor
            unflattenedData.vendor = ensureValidObjectId(unflattenedData.vendor, new mongoose.Types.ObjectId());

            // PAN Status
            if (unflattenedData.panStatus) {
              try {
                const panStatusDoc = panStatusMasters.find(p => 
                  p.name && p.name.toLowerCase() === unflattenedData.panStatus.toLowerCase()
                );
                unflattenedData.panStatus = panStatusDoc ? panStatusDoc._id : existingBill.panStatus;
              } catch (error) {
                console.error('Error finding PAN status:', error);
                unflattenedData.panStatus = existingBill.panStatus;
              }
            } else {
              unflattenedData.panStatus = existingBill.panStatus;
            }

            // Compliance 206AB
            if (unflattenedData.compliance206AB) {
              try {
                const complianceDoc = await ComplianceMaster.findOne({
                  compliance206AB: { $regex: new RegExp(unflattenedData.compliance206AB, 'i') }
                });
                unflattenedData.compliance206AB = complianceDoc ? complianceDoc._id : existingBill.compliance206AB;
              } catch (error) {
                console.error('Error finding compliance:', error);
                unflattenedData.compliance206AB = existingBill.compliance206AB;
              }
            } else {
              unflattenedData.compliance206AB = existingBill.compliance206AB;
            }

            // Region (special case - stored as name, not ObjectId)
            if (unflattenedData.region) {
              try {
                const regionDoc = regionMasters.find(r =>
                  r.name && r.name.toLowerCase() === unflattenedData.region.toLowerCase()
                );
                unflattenedData.region = regionDoc ? regionDoc.name : existingBill.region || defaultRegion.name;
              } catch (error) {
                console.error('Error finding region:', error);
                unflattenedData.region = existingBill.region || defaultRegion.name;
              }
            } else {
              unflattenedData.region = existingBill.region || defaultRegion.name;
            }
            
            toUpdate.push({ 
              _id: existingBill._id, 
              data: unflattenedData
            });
          } else if (!patchOnly) {
            // Only add to insert list if patchOnly is false
            // Unflatten the validated data
            const unflattenedData = unflattenData(validatedData);
            
            // Process date fields in the unflattened data
            processDateFields(unflattenedData);
            
            // Ensure all required fields are present in the new bill
            if (!unflattenedData.region) unflattenedData.region = defaultRegion.name;
            if (!unflattenedData.currency) unflattenedData.currency = defaultCurrency._id;
            if (!unflattenedData.natureOfWork) unflattenedData.natureOfWork = defaultNature._id;
            if (!unflattenedData.vendor) unflattenedData.vendor = new mongoose.Types.ObjectId();
            if (!unflattenedData.billDate) unflattenedData.billDate = new Date();
            if (!unflattenedData.amount) unflattenedData.amount = 0;
            if (!unflattenedData.vendorName) unflattenedData.vendorName = "Unknown Vendor";
            if (!unflattenedData.vendorNo) unflattenedData.vendorNo = "Unknown";
            if (!unflattenedData.projectDescription) unflattenedData.projectDescription = "N/A";
            if (!unflattenedData.poCreated) unflattenedData.poCreated = "No";
            if (!unflattenedData.siteStatus) unflattenedData.siteStatus = "hold";
            if (!unflattenedData.department) unflattenedData.department = "DEFAULT DEPT";
            if (!unflattenedData.taxInvRecdBy) unflattenedData.taxInvRecdBy = "SYSTEM IMPORT";
            if (!unflattenedData.taxInvRecdAtSite) unflattenedData.taxInvRecdAtSite = new Date();
            
            // Create final bill document
            const billDoc = {
              ...unflattenedData,
              _importMode: true // Special flag to indicate this is imported
            };
            
            toInsert.push(billDoc);
          } else {
            nonExistentVendors.push({ srNo, vendorNo, vendorName, rowNumber, reason: 'Bill does not exist in patchOnly mode' });
          }
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          throw new Error(`Row ${rowNumber}: ${error.message}`);
        }
      }
    }
    
    // Process the data
    let insertCount = 0;
    let updateCount = 0;
    
    // Insert new bills
    if (toInsert.length > 0) {
      try {
        // Apply special import mode flag to trigger custom srNo handling
        const bulkInsert = await Bill.insertMany(toInsert.map(bill => {
          // Ensure compliance206AB is properly handled
          if (bill.compliance206AB && typeof bill.compliance206AB === 'string') {
            bill.compliance206AB = null; // Set to null instead of string to avoid cast errors
          }
          
          // Ensure all ObjectId references are valid
          // For mandatory references, validate they're not strings or invalid ObjectIds
          ['region', 'currency', 'natureOfWork', 'vendor'].forEach(field => {
            // If it's a string or invalid, replace with appropriate default
            if (typeof bill[field] === 'string' || !bill[field]) {
              switch(field) {
                case 'region':
                  bill[field] = defaultRegion.name;
                  break;
                case 'currency':
                  bill[field] = defaultCurrency._id;
                  break;
                case 'natureOfWork':
                  bill[field] = defaultNature._id;
                  break;
                case 'vendor':
                  // For vendor, we may need to create a new ObjectId as fallback
                  bill[field] = new mongoose.Types.ObjectId();
                  break;
              }
            }
          });
          
          return {
            ...bill,
            _importMode: true
          };
        }), {
          // Disable Mongoose validation to avoid strict schema issues during import
          validateBeforeSave: false
        });
        
        insertCount = bulkInsert.length;
      } catch (error) {
        console.error("Insert error details:", error);
        
        // More detailed error reporting to help diagnose validation issues
        if (error.name === 'ValidationError' && error.errors) {
          const fieldErrors = Object.keys(error.errors).map(field => {
            return `Field '${field}': ${error.errors[field].message}`;
          }).join('; ');
          throw new Error(`Bill validation failed: ${fieldErrors}`);
        } else {
          throw new Error(`Error inserting new bills: ${error.message}`);
        }
      }
    }
    
    // Update existing bills
    if (toUpdate.length > 0) {
      try {
        // Update each bill separately to handle special fields and validations
        for (const { _id, data } of toUpdate) {
          // Ensure compliance206AB is properly handled before update
          if (data.compliance206AB && typeof data.compliance206AB === 'string') {
            data.compliance206AB = null; // Set to null instead of string to avoid cast errors
          }
          
          // Ensure all ObjectId references are valid
          // For mandatory references, validate they're not strings or invalid ObjectIds
          ['region', 'currency', 'natureOfWork', 'vendor'].forEach(field => {
            // If it's a string or invalid, replace with appropriate default
            if (typeof data[field] === 'string' || !data[field]) {
              switch(field) {
                case 'region':
                  data[field] = defaultRegion.name;
                  break;
                case 'currency':
                  data[field] = defaultCurrency._id;
                  break;
                case 'natureOfWork':
                  data[field] = defaultNature._id;
                  break;
                case 'vendor':
                  // For vendor, we can keep the existing one or use a new ObjectId as fallback
                  data[field] = new mongoose.Types.ObjectId();
                  break;
              }
            }
          });
          
          await Bill.findByIdAndUpdate(
            _id, 
            {
              ...data,
              _importMode: true
            }, 
            { 
              new: true,
              validateBeforeSave: false
            }
          );
          updateCount++;
        }
      } catch (error) {
        console.error("Update error details:", error);
        
        // More detailed error reporting to help diagnose validation issues
        if (error.name === 'ValidationError' && error.errors) {
          const fieldErrors = Object.keys(error.errors).map(field => {
            return `Field '${field}': ${error.errors[field].message}`;
          }).join('; ');
          throw new Error(`Bill update validation failed: ${fieldErrors}`);
        } else {
          throw new Error(`Error updating existing bills: ${error.message}`);
        }
      }
    }
    
    return { 
      inserted: insertCount, 
      updated: updateCount, 
      skipped: alreadyExistingBills.length,
      nonExistentVendors
    };
    
  } catch (error) {
    console.error('Excel import error:', error);
    throw error;
  }
};
