import fs from 'fs';
import { Parser } from 'json2csv';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import Bill from "../models/bill-model.js";
import mongoose from "mongoose";
import PanStatusMaster from "../models/pan-status-master-model.js";

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
      const srNo = rowData.srNo;
      
      if (vendorNo && validVendorNos.length > 0 && !validVendorNos.includes(vendorNo)) {
        nonExistentVendors.push({ srNo, vendorNo, rowNumber: i });
        continue; // Skip this row
      }
      
      // Add default fields needed for MongoDB
      rowData.billDate = rowData.taxInvDate || new Date().toISOString().split('T')[0];
      rowData.amount = rowData.taxInvAmt || 0;
      rowData.natureOfWork = rowData.typeOfInv || "Others";
      rowData.vendor = new mongoose.Types.ObjectId();

      // PAN Status mapping
      if (rowData.panStatus) {
        let panStatusDoc = null;
        if (typeof rowData.panStatus === "string") {
          panStatusDoc = await PanStatusMaster.findOne({ name: rowData.panStatus.toUpperCase() });
        } else if (typeof rowData.panStatus === "object" && rowData.panStatus._id) {
          panStatusDoc = await PanStatusMaster.findById(rowData.panStatus._id);
        }
        rowData.panStatus = panStatusDoc ? panStatusDoc._id : null;
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
      inserted = await Bill.insertMany(toInsert);
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
    const existingSrNos = [];
    const nonExistentVendors = [];
    const startRowIndex = headerRowIndex + 1;
    
    // First, collect all sr numbers to check against DB
    const srNosInExcel = [];
    for (let rowNumber = startRowIndex; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const srNoCell = row.getCell(1); // Assuming Sr No is in the first column
      
      if (srNoCell.value) {
        srNosInExcel.push(String(srNoCell.value).trim());
      }
    }
    
    // Query DB to find existing bills with these sr numbers
    const existingBills = await Bill.find({ srNo: { $in: srNosInExcel } }).lean();
    const existingBillsBySrNo = {};
    existingBills.forEach(bill => {
      existingBillsBySrNo[bill.srNo] = bill;
      existingSrNos.push(bill.srNo);
    });
    
    // Keep track of used srNos within this import batch to avoid duplicates
    const usedSrNos = new Set();
    
    for (let rowNumber = startRowIndex; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = {};
      
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
        rowData[fieldName] = value;
      });
      
      if (!isEmpty && srNo) {
        try {
          // Store original Excel serial number as srNoOld
          rowData.srNoOld = srNo;
          rowData.excelSrNo = srNo;
          
          // First check if this bill already exists in the database with its exact serial number
          const existingBillWithSameSerialNo = await Bill.findOne({ srNo: srNo }).lean();
          
          if (existingBillWithSameSerialNo) {
            console.log(`Bill with serial number ${srNo} already exists in the database (ID: ${existingBillWithSameSerialNo._id})`);
            
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
              rowData.billDate = rowData.taxInvDate || existingBillWithSameSerialNo.billDate || new Date();
              rowData.amount = rowData.taxInvAmt || existingBillWithSameSerialNo.amount || 0;
              rowData.natureOfWork = rowData.typeOfInv || existingBillWithSameSerialNo.natureOfWork || "Others";
              rowData.vendor = existingBillWithSameSerialNo.vendor; // Keep existing vendor reference
              
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

              // PAN Status mapping
              if (rowData.panStatus) {
                let panStatusDoc = null;
                if (typeof rowData.panStatus === "string") {
                  panStatusDoc = await PanStatusMaster.findOne({ name: rowData.panStatus.toUpperCase() });
                } else if (typeof rowData.panStatus === "object" && rowData.panStatus._id) {
                  panStatusDoc = await PanStatusMaster.findById(rowData.panStatus._id);
                }
                rowData.panStatus = panStatusDoc ? panStatusDoc._id : null;
              }
              
              const typedData = convertTypes(rowData);
              const validatedData = validateRequiredFields(typedData);
              
              // Safety checks for date fields
              if (validatedData.accountsDept) {
                const dateFields = [
                  'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
                  'paymentDate'
                ];
                
                dateFields.forEach(field => {
                  if (validatedData.accountsDept[field] && 
                      typeof validatedData.accountsDept[field] === 'string') {
                    validatedData.accountsDept[field] = null;
                  }
                });
              }
              
              // Merge data with existing bill data - the mergeWithExisting function 
              // already implements the "don't overwrite non-null with null" logic
              const mergedData = mergeWithExisting(existingBillWithSameSerialNo, validatedData);
              
              toUpdate.push({ 
                _id: existingBillWithSameSerialNo._id, 
                data: unflattenData(mergedData) 
              });
              
              // Track this as an already existing bill that's now queued for update
              alreadyExistingBills.push({
                srNo: srNo,
                _id: existingBillWithSameSerialNo._id,
                vendorName: vendorName,
                rowNumber,
                updating: true
              });
              
              continue; // Skip the rest of this iteration and go to the next row
            } else {
              // In normal import mode, just track as existing and skip
              alreadyExistingBills.push({
                srNo: srNo,
                _id: existingBillWithSameSerialNo._id,
                vendorName: vendorName,
                rowNumber
              });
              continue; // Skip this row
            }
          }
          
          // For bills that don't already exist...
          // Convert Excel serial number format to get the financial year prefix
          const convertedSrNo = convertExcelSrNo(srNo);
          const prefix = convertedSrNo.substring(0, 4); // Get "2425" part
          
          // Generate a guaranteed unique serial number
          rowData.srNo = await generateUniqueSerialNumber(prefix);
          console.log(`Assigned unique serial number: Original=${srNo}, New=${rowData.srNo}`);
          
          // MODIFIED: Check if vendor name exists instead of vendor number
          // We'll skip validation if vendorName is missing or if no list is provided
          if (vendorName && validVendorNos.length > 0) {
            // Use fuzzy matching - check if the vendor name includes/matches any valid vendor
            // This is more flexible than exact matching
            const isValidVendor = validVendorNos.some(validVendor => 
              vendorName.toLowerCase().includes(validVendor.toLowerCase()) || 
              validVendor.toLowerCase().includes(vendorName.toLowerCase())
            );
            
            if (!isValidVendor) {
              nonExistentVendors.push({ srNo, vendorNo, vendorName, rowNumber });
              continue; // Skip this row
            }
          }
          
          // Add default fields needed for MongoDB
          rowData.billDate = rowData.taxInvDate || new Date();
          rowData.amount = rowData.taxInvAmt || 0;
          rowData.natureOfWork = rowData.typeOfInv || "Others";
          rowData.vendor = new mongoose.Types.ObjectId(); // Will be replaced for updates
          
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

          // PAN Status mapping
          if (rowData.panStatus) {
            let panStatusDoc = null;
            if (typeof rowData.panStatus === "string") {
              panStatusDoc = await PanStatusMaster.findOne({ name: rowData.panStatus.toUpperCase() });
            } else if (typeof rowData.panStatus === "object" && rowData.panStatus._id) {
              panStatusDoc = await PanStatusMaster.findById(rowData.panStatus._id);
            }
            rowData.panStatus = panStatusDoc ? panStatusDoc._id : null;
          }
          
          const typedData = convertTypes(rowData);
          const validatedData = validateRequiredFields(typedData);
          
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
          
          // Check if this is an update or new insert
          if (existingSrNos.includes(Number(srNo))) {
            const existingBill = existingBillsBySrNo[Number(srNo)];
            
            // Merge data - don't overwrite non-null DB values with null Excel values
            const mergedData = mergeWithExisting(existingBill, validatedData);
            toUpdate.push({ 
              _id: existingBill._id, 
              data: unflattenData(mergedData) 
            });
          } else if (!patchOnly) {
            // Only add to insert list if patchOnly is false
            // New insert - only if vendor validation was not enabled or passed
            const unflattened = unflattenData(validatedData);
            toInsert.push(unflattened);
          } else {
            nonExistentVendors.push({ srNo, vendorNo, vendorName, rowNumber, reason: 'Bill does not exist in patchOnly mode' });
          }
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          throw new Error(`Row ${rowNumber}: ${error.message}`);
        }
      }
    }
    
    // Handle inserts
    let inserted = [];
    if (toInsert.length > 0) {
      try {
        // Set import mode to avoid validation errors
        inserted = await Bill.insertMany(toInsert.map(bill => {
          // Ensure returnedToPimo is properly set or null
          if (bill.accountsDept && typeof bill.accountsDept.returnedToPimo === 'string') {
            bill.accountsDept.returnedToPimo = null;
          }
          return bill;
        }), { 
          validateBeforeSave: false // Skip mongoose validation
        });
      } catch (insertError) {
        console.error('Error during bill insertion:', insertError);
        throw insertError;
      }
    }
    
    // Handle updates
    const updated = [];
    for (const item of toUpdate) {
      try {
        const updateData = item.data;
        
        // Handle problematic date fields before update
        if (updateData.accountsDept && typeof updateData.accountsDept.returnedToPimo === 'string') {
          updateData.accountsDept.returnedToPimo = null;
        }
        
        const result = await Bill.findByIdAndUpdate(
          item._id,
          { $set: updateData },
          { 
            new: true,
            runValidators: false // Skip mongoose validation
          }
        );
        if (result) updated.push(result);
      } catch (updateError) {
        console.error(`Error updating bill ${item._id}:`, updateError);
        // Continue with other updates
      }
    }
    
    return {
      inserted,
      updated,
      nonExistentVendors,
      alreadyExistingBills, // Add this new property to the return object
      totalProcessed: inserted.length + updated.length,
      totalSkipped: nonExistentVendors.length + alreadyExistingBills.length
    };
    
  } catch (error) {
    console.error('Excel import error:', error);
    throw error;
  }
};
