import fs from 'fs';
import ExcelJS from 'exceljs';
import os from 'os';
import path from 'path';
import mongoose from "mongoose";
import Bill from "../models/bill-model.js";  // Add this import
import RegionMaster from "../models/region-master-model.js";

// Complete fields array matching Excel columns
export const fields = [
    "srNo",
    "srNoOld",
    "typeOfInv",
    "region",
    "projectDescription",
    "vendorNo",
    "vendorName",
    "gstNumber",
    "compliance206AB",
    "panStatus",
    "poCreated",
    "poNo",
    "poDate",
    "poAmt",
    "proformaInvNo",
    "proformaInvDate",
    "proformaInvAmt",
    "proformaInvRecdAtSite",
    "proformaInvRecdBy",
    "taxInvNo",
    "taxInvDate",
    "currency",
    "taxInvAmt",
    "taxInvRecdAtSite",
    "taxInvRecdBy",
    "department",
    "remarksBySiteTeam",
    "attachment",
    "attachmentType",
    "advanceDate",
    "advanceAmt",
    "advancePercentage",
    "advRequestEnteredBy",
    "qualityEngineer.dateGiven",
    "qualityEngineer.name",
    "qsInspection.dateGiven",
    "qsInspection.name",
    "qsMeasurementCheck.dateGiven",
    "vendorFinalInv.dateGiven",
    "qsCOP.dateGiven",
    "qsCOP.name",
    "copDetails.date",
    "copDetails.amount",
    "remarksByQSTeam",
    "migoDetails.dateGiven",
    "migoDetails.no",
    "migoDetails.date",
    "migoDetails.amount",
    "migoDetails.doneBy",
    "invReturnedToSite",
    "siteEngineer.dateGiven",
    "siteEngineer.name",
    "architect.dateGiven",
    "architect.name",
    "siteIncharge.dateGiven",
    "siteIncharge.name",
    "remarks",
    "siteOfficeDispatch.dateGiven",
    "siteOfficeDispatch.name",
    "status",
    "pimoMumbai.dateGiven",
    "pimoMumbai.dateReceived",
    "pimoMumbai.receivedBy",
    "qsMumbai.dateGiven",
    "qsMumbai.name",
    "pimoMumbai.dateGivenPIMO",
    "pimoMumbai.namePIMO",
    "itDept.dateGiven",
    "itDept.name",
    "pimoMumbai.dateGivenPIMO2",
    "pimoMumbai.namePIMO2",
    "sesDetails.no",
    "sesDetails.amount",
    "sesDetails.date",
    "sesDetails.doneBy",
    "pimoMumbai.dateReceivedFromPIMO",
    "approvalDetails.directorApproval.dateGiven",
    "approvalDetails.directorApproval.dateReceived",
    "approvalDetails.remarksPimoMumbai",
    "accountsDept.dateGiven",
    "accountsDept.givenBy",
    "accountsDept.dateReceived",
    "accountsDept.receivedBy",
    "accountsDept.returnedToPimo",
    "accountsDept.receivedBack",
    "accountsDept.invBookingChecking",
    "accountsDept.paymentInstructions",
    "accountsDept.remarksForPayInstructions",
    "accountsDept.f110Identification",
    "accountsDept.paymentDate",
    "accountsDept.hardCopy",
    "accountsDept.accountsIdentification",
    "accountsDept.paymentAmt",
    "accountsDept.remarksAcctsDept",
    "accountsDept.status"
];

// Helper: unflatten nested objects
export const unflattenData = (data) => {
  const result = {};
  for (const key in data) {
    const keys = key.split('.');
    keys.reduce((acc, part, index) => {
      if (index === keys.length - 1) {
        acc[part] = data[key];
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, result);
  }
  return result;
};

// Helper: flatten nested objects (using dot notation)
export const flattenDoc = (doc, path = '') => {
  let res = {};
  for (let key in doc) {
    const newPath = path ? `${path}.${key}` : key;
    if (typeof doc[key] === 'object' && doc[key] !== null && !(doc[key] instanceof Date)) {
      Object.assign(res, flattenDoc(doc[key], newPath));
    } else {
      res[newPath] = doc[key];
    }
  }
  return res;
};

// Helper: parse dates in various formats
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  try {
    // Convert to string if not already
    const strDate = String(dateString).trim();
    
    // Handle Excel date format (DD-MM-YYYY)
    const ddmmyyyyRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const ddmmyyyyMatch = strDate.match(ddmmyyyyRegex);
    
    if (ddmmyyyyMatch) {
      const [_, day, month, year] = ddmmyyyyMatch;
      
      // Ensure we're treating these as integers
      const dayInt = parseInt(day, 10);
      const monthInt = parseInt(month, 10) - 1; // Month is 0-indexed in JavaScript Date
      const yearInt = parseInt(year, 10);
      
      // Create date with noon time to avoid timezone issues
      const date = new Date(yearInt, monthInt, dayInt, 12, 0, 0);
      if (!isNaN(date.getTime()) && 
          date.getDate() === dayInt && 
          date.getMonth() === monthInt && 
          date.getFullYear() === yearInt) {
        return date;
      } else {
        // Date creation failed
      }
    }
    
    // Handle slash-separated format (DD/MM/YYYY)
    const ddmmyyyySlashRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const ddmmyyyySlashMatch = strDate.match(ddmmyyyySlashRegex);
    
    if (ddmmyyyySlashMatch) {
      const [_, day, month, year] = ddmmyyyySlashMatch;
      const dayInt = parseInt(day, 10);
      const monthInt = parseInt(month, 10) - 1;
      const yearInt = parseInt(year, 10);
      
      // Create date with noon time to avoid timezone issues
      const date = new Date(yearInt, monthInt, dayInt, 12, 0, 0);
      if (!isNaN(date.getTime()) &&
          date.getDate() === dayInt && 
          date.getMonth() === monthInt && 
          date.getFullYear() === yearInt) {
        return date;
      }
    }
    
    // Try to parse with built-in Date parser - this will interpret as MM/DD/YYYY for ambiguous formats
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // As a last resort for DD-MM-YYYY format, try manual parsing
    if (strDate.includes('-')) {
      const parts = strDate.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        
        // Handle 2-digit years
        const adjustedYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        
        const manualDate = new Date(adjustedYear, month, day);
        if (!isNaN(manualDate.getTime())) {
          return manualDate;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing date '${dateString}':`, error);
    return null;
  }
};

// Helper: convert amount strings to numbers
export const parseAmount = (value) => {
  if (!value) return 0;
  // Remove currency symbols, commas and spaces
  const cleaned = value.toString().replace(/[₹,$€¥\s,]/g, '').trim();
  return parseFloat(cleaned) || 0;
};

// Helper function to organize QS fields properly
export const organizeQSFields = (data) => {
  // Check if we have QS-related fields that need to be organized
  const qsFieldMappings = {
    "Dt given to QS for Inspection": { target: "qsInspection", property: "dateGiven" },
    "Name of QS": { target: "qsInspection", property: "name" },
    "Checked  by QS with Dt of Measurment": { target: "qsMeasurementCheck", property: "dateGiven" },
    "Given to vendor-Query/Final Inv": { target: "vendorFinalInv", property: "dateGiven" },
    "Dt given to QS for COP": { target: "qsCOP", property: "dateGiven" },
    "Name - QS": { target: "qsCOP", property: "name" }
  };
  
  // Initialize the target objects if not already present
  data.qsInspection = data.qsInspection || {};
  data.qsMeasurementCheck = data.qsMeasurementCheck || {};
  data.vendorFinalInv = data.vendorFinalInv || {};
  data.qsCOP = data.qsCOP || {};
  
  // Process each mapping
  Object.entries(qsFieldMappings).forEach(([sourceField, mapping]) => {
    if (sourceField in data) {
      // If the source field exists, map it to the target field
      if (!data[mapping.target]) {
        data[mapping.target] = {};
      }
      
      // Only set if value is not empty
      if (data[sourceField] !== null && data[sourceField] !== undefined && data[sourceField] !== '') {
        data[mapping.target][mapping.property] = data[sourceField];
      }
      
      // Remove the original field to avoid duplication
      delete data[sourceField];
    }
  });
  
  // Add some logic to make sure vendor data is stored properly in vendorFinalInv
  if (data.vendorFinalInv && data.vendorFinalInv.dateGiven && !data.vendorFinalInv.name) {
    // If we have a date but no name, try to use the QS name
    if (data.qsInspection && data.qsInspection.name) {
      data.vendorFinalInv.name = data.qsInspection.name;
    } else if (data.qsCOP && data.qsCOP.name) {
      data.vendorFinalInv.name = data.qsCOP.name;
    }
  }
  
  return data;
};

// Helper: convert strings to appropriate types
export const convertTypes = (data) => {
  // Create a deep copy of the data
  let result = JSON.parse(JSON.stringify(data));
  
  // Organize Quality Surveyor (QS) related fields
  organizeQSFields(result);
  
  // Currency formatting
  if (result.amount && typeof result.amount === 'string') {
    result.amount = parseAmount(result.amount);
  }
  
  if (result.poAmt && typeof result.poAmt === 'string') {
    result.poAmt = parseAmount(result.poAmt);
  }
  
  if (result.proformaInvAmt && typeof result.proformaInvAmt === 'string') {
    result.proformaInvAmt = parseAmount(result.proformaInvAmt);
  }
  
  if (result.taxInvAmt && typeof result.taxInvAmt === 'string') {
    result.taxInvAmt = parseAmount(result.taxInvAmt);
  }
  
  if (result.advanceAmt && typeof result.advanceAmt === 'string') {
    result.advanceAmt = parseAmount(result.advanceAmt);
  }
  
  // Parse basic date fields
  if (result.billDate && typeof result.billDate === 'string') {
    result.billDate = parseDate(result.billDate);
  }
  
  if (result.poDate && typeof result.poDate === 'string') {
    result.poDate = parseDate(result.poDate);
  }
  
  if (result.proformaInvDate && typeof result.proformaInvDate === 'string') {
    result.proformaInvDate = parseDate(result.proformaInvDate);
  }
  
  if (result.proformaInvRecdAtSite && typeof result.proformaInvRecdAtSite === 'string') {
    result.proformaInvRecdAtSite = parseDate(result.proformaInvRecdAtSite);
  }
  
  if (result.taxInvDate && typeof result.taxInvDate === 'string') {
    result.taxInvDate = parseDate(result.taxInvDate);
  }
  
  if (result.taxInvRecdAtSite && typeof result.taxInvRecdAtSite === 'string') {
    result.taxInvRecdAtSite = parseDate(result.taxInvRecdAtSite);
  }
  
  if (result.advanceDate && typeof result.advanceDate === 'string') {
    result.advanceDate = parseDate(result.advanceDate);
  }
  
  // Parse dates in nested objects if they exist
  // This handles fields after we've organized QS fields
  if (result.copDetails && result.copDetails.date && typeof result.copDetails.date === 'string') {
    result.copDetails.date = parseDate(result.copDetails.date);
  }
  
  if (result.migoDetails) {
    if (result.migoDetails.date && typeof result.migoDetails.date === 'string') {
      result.migoDetails.date = parseDate(result.migoDetails.date);
    }
    if (result.migoDetails.dateGiven && typeof result.migoDetails.dateGiven === 'string') {
      result.migoDetails.dateGiven = parseDate(result.migoDetails.dateGiven);
    }
    if (result.migoDetails.amount && typeof result.migoDetails.amount === 'string') {
      result.migoDetails.amount = parseAmount(result.migoDetails.amount);
    }
  }
  
  if (result.invReturnedToSite && typeof result.invReturnedToSite === 'string') {
    result.invReturnedToSite = parseDate(result.invReturnedToSite);
  }
  
  // Handle nested date fields in objects
  const nestedDateObjects = [
    'qualityEngineer', 'qsInspection', 'qsMeasurementCheck', 'vendorFinalInv', 
    'qsCOP', 'siteEngineer', 'architect', 'siteIncharge', 'siteOfficeDispatch',
    'qsMumbai', 'pimoMumbai', 'itDept'
  ];
  
  nestedDateObjects.forEach(obj => {
    if (result[obj]) {
      if (result[obj].dateGiven && typeof result[obj].dateGiven === 'string') {
        result[obj].dateGiven = parseDate(result[obj].dateGiven);
      }
      if (result[obj].dateReceived && typeof result[obj].dateReceived === 'string') {
        result[obj].dateReceived = parseDate(result[obj].dateReceived);
      }
    }
  });
  
  // Special handling for PIMO Mumbai fields
  if (result.pimoMumbai) {
    if (result.pimoMumbai.dateGivenPIMO && typeof result.pimoMumbai.dateGivenPIMO === 'string') {
      result.pimoMumbai.dateGivenPIMO = parseDate(result.pimoMumbai.dateGivenPIMO);
    }
    if (result.pimoMumbai.dateGivenPIMO2 && typeof result.pimoMumbai.dateGivenPIMO2 === 'string') {
      result.pimoMumbai.dateGivenPIMO2 = parseDate(result.pimoMumbai.dateGivenPIMO2);
    }
    if (result.pimoMumbai.dateReceivedFromIT && typeof result.pimoMumbai.dateReceivedFromIT === 'string') {
      result.pimoMumbai.dateReceivedFromIT = parseDate(result.pimoMumbai.dateReceivedFromIT);
    }
    if (result.pimoMumbai.dateReceivedFromPIMO && typeof result.pimoMumbai.dateReceivedFromPIMO === 'string') {
      result.pimoMumbai.dateReceivedFromPIMO = parseDate(result.pimoMumbai.dateReceivedFromPIMO);
    }
  }
  
  // Handle SES details
  if (result.sesDetails) {
    if (result.sesDetails.date && typeof result.sesDetails.date === 'string') {
      result.sesDetails.date = parseDate(result.sesDetails.date);
    }
    if (result.sesDetails.amount && typeof result.sesDetails.amount === 'string') {
      result.sesDetails.amount = parseAmount(result.sesDetails.amount);
    }
  }
  
  // Handle approval details
  if (result.approvalDetails && result.approvalDetails.directorApproval) {
    if (result.approvalDetails.directorApproval.dateGiven && 
        typeof result.approvalDetails.directorApproval.dateGiven === 'string') {
      result.approvalDetails.directorApproval.dateGiven = 
        parseDate(result.approvalDetails.directorApproval.dateGiven);
    }
    if (result.approvalDetails.directorApproval.dateReceived && 
        typeof result.approvalDetails.directorApproval.dateReceived === 'string') {
      result.approvalDetails.directorApproval.dateReceived = 
        parseDate(result.approvalDetails.directorApproval.dateReceived);
    }
  }
  
  // Handle accounts department - ensure all date fields are properly parsed
  if (result.accountsDept) {
    // Explicitly parse all date fields in accountsDept
    const accountsDateFields = [
      'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
      'paymentDate', 'invBookingChecking'
    ];
    
    accountsDateFields.forEach(dateField => {
      if (result.accountsDept[dateField] && typeof result.accountsDept[dateField] === 'string') {
        try {
          // Special handling for the problematic returnedToPimo field
          if (dateField === 'returnedToPimo') {
            // Try direct parsing first
            let parsedDate = parseDate(result.accountsDept[dateField]);
            
            // If parsing failed, try additional format handling
            if (!parsedDate) {
              const dateParts = result.accountsDept[dateField].split('-');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(parsedDate.getTime())) {
                  // Successfully parsed manually
                }
              }
            }
            
            result.accountsDept[dateField] = parsedDate;
          } else {
            // Normal parsing for other date fields
            result.accountsDept[dateField] = parseDate(result.accountsDept[dateField]);
          }
        } catch (error) {
          console.error(`Error parsing accountsDept.${dateField}:`, error);
          // Set to null to avoid validation error
          result.accountsDept[dateField] = null;
        }
      }
    });
    
    // Handle payment amount
    if (result.accountsDept.paymentAmt && typeof result.accountsDept.paymentAmt === 'string') {
      result.accountsDept.paymentAmt = parseAmount(result.accountsDept.paymentAmt);
    }
  }
  
  return result;
};

// Improved helper function to merge data without overwriting non-null DB values with null Excel values
export const mergeWithExisting = (existingData, newData) => {
  // First organize QS fields in the new data to ensure proper structure
  organizeQSFields(newData);
  
  // Deep merge with special handling for null/undefined values
  const deepMerge = (existing, updates) => {
    if (!existing) return updates;
    if (!updates) return existing;
    
    // Create a copy of the existing data as our result
    const result = { ...existing };
    
    // Process each key in the updates
    Object.keys(updates).forEach(key => {
      const existingValue = existing[key];
      const newValue = updates[key];
      
      // Special handling for GST Number field
      if (key === 'gstNumber') {
        // Check if the new value is a placeholder GST value
        const isPlaceholderGST = !newValue || 
          newValue === '' || 
          newValue === 'NOTPROVIDED' || 
          newValue === 'NOT PROVIDED' || 
          newValue === 'NotProvided' || 
          newValue === 'Not Provided' || 
          newValue === 'N/A' || 
          newValue === 'NA';
          
        // Check if existing value looks like a valid GST (15 chars)
        const hasValidExistingGST = existingValue && 
          typeof existingValue === 'string' && 
          existingValue.length === 15 &&
          !['NOTPROVIDED', 'NOT PROVIDED', 'NotProvided', 'Not Provided'].includes(existingValue);
          
        if (isPlaceholderGST && hasValidExistingGST) {
          // Keep the existing valid GST number instead of overwriting with placeholder
          return; // Skip this update
        }
      }
      
      // Check if the new value is a placeholder or empty value
      const isPlaceholderValue = 
        newValue === null || 
        newValue === undefined || 
        newValue === '' || 
        newValue === 'Not Provided' || 
        newValue === 'Not provided' || 
        newValue === 'not provided' ||
        newValue === 'N/A' ||
        newValue === 'n/a';
      
      // Case 1: New value is null/undefined/empty string/placeholder - don't overwrite existing data
      if (isPlaceholderValue) {
        // Keep existing value
      }
      // Case 2: Both are objects (but not Date) - recursive merge
      else if (
        existingValue && 
        typeof existingValue === 'object' && 
        !(existingValue instanceof Date) &&
        typeof newValue === 'object' && 
        !(newValue instanceof Date)
      ) {
        result[key] = deepMerge(existingValue, newValue);
      }
      // Case 3: New value exists - use it
      else {
        result[key] = newValue;
      }
    });
    
    return result;
  };

  // Perform the deep merge
  return deepMerge(existingData, newData);
};

// Helper: create a temporary file path
export const createTempFilePath = (prefix, extension) => {
  const tempDir = os.tmpdir();
  const fileName = `${prefix}-${Date.now()}.${extension}`;
  return path.join(tempDir, fileName);
};

// Helper: convert Excel serial number to new format with full financial year
export const convertExcelSrNo = (excelSrNo) => {
  console.log(`convertExcelSrNo - Input value: "${excelSrNo}"`);
  
  if (!excelSrNo) return null;
  
  const srNoStr = String(excelSrNo).trim();
  console.log(`convertExcelSrNo - Converted to string: "${srNoStr}"`);
  
  // Check if the srNo already has the correct format (starts with 2425)
  if (srNoStr.startsWith('2425')) {
    console.log(`convertExcelSrNo - Serial number already has correct format: "${srNoStr}"`);
    return srNoStr;
  }
  
  if (srNoStr.length < 3) return srNoStr;
  
  // Extract the year part (first two digits)
  const yearPart = srNoStr.substring(0, 2);
  const restPart = srNoStr.substring(2);
  console.log(`convertExcelSrNo - Extracted parts: yearPart="${yearPart}", restPart="${restPart}"`);
  
  // Convert year to number and calculate next year
  const yearNum = parseInt(yearPart, 10);
  const nextYearNum = yearNum + 1;
  
  // Create full financial year (e.g., 2425 for FY 2024-25)
  const fullFinancialYear = `${yearPart}${nextYearNum < 10 ? '0' + nextYearNum : nextYearNum}`;
  console.log(`convertExcelSrNo - Full financial year: ${fullFinancialYear}`);
  
  // Format new serial number with full financial year
  const result = `${fullFinancialYear}${restPart}`;
  console.log(`convertExcelSrNo - Final result: "${result}"`);
  
  return result;
};

// Helper function to find next available serial number
export const findNextAvailableSrNo = async (basePrefix, baseNumber) => {
  // Find the highest existing srNo with the same prefix
  const latestBill = await Bill.findOne({
    srNo: { $regex: `^${basePrefix}` }
  }).sort({ srNo: -1 });
  
  console.log(`Checking for latest bill with prefix ${basePrefix}, found:`, latestBill?.srNo);
  
  let nextNumber = baseNumber;
  
  if (latestBill) {
    // Extract the numeric part from the latest srNo
    const latestSrNo = latestBill.srNo;
    const restPart = parseInt(latestSrNo.substring(basePrefix.length), 10);
    
    // Use whichever is higher - our base number or the latest + 1
    nextNumber = Math.max(baseNumber, restPart + 1);
    console.log(`Latest number in DB: ${restPart}, next available: ${nextNumber}`);
  }
  
  // Format to have leading zeros
  const paddedNumber = String(nextNumber).padStart(5, '0');
  return `${basePrefix}${paddedNumber}`;
};

// Add validation function for required fields with defaults
export const validateRequiredFields = async (data) => {
  const requiredFields = [
    'typeOfInv',
    'projectDescription',
    'vendorNo',
    'vendorName',
    'gstNumber',
    'compliance206AB',
    'panStatus',
    'poCreated',
    'billDate',
    'amount',
    'currency',
    'region',
    'natureOfWork'
  ];

  // Apply defaults and validations
  const defaults = {
    typeOfInv: "Others",
    projectDescription: "NA",
    vendorNo: "DEFAULT001",
    vendorName: "Default Vendor",
    gstNumber: "NOTPROVIDED",
    compliance206AB: "206AB check on website",
    panStatus: "PAN operative/N.A.",
    poCreated: "No",
    billDate: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: "INR",
    region: "MUMBAI",
    natureOfWork: "Others",
    attachmentType: "Others",
    vendor: new mongoose.Types.ObjectId()
  };

  // Apply defaults for missing fields
  Object.keys(defaults).forEach(key => {
    if (!data[key] || data[key] === '') {
      data[key] = defaults[key];
    }
  });

  // Always ensure vendor field is present with a valid ObjectId
  if (!data.vendor || !mongoose.Types.ObjectId.isValid(data.vendor)) {
    data.vendor = defaults.vendor;
  }

  // Validate amount is a number
  data.amount = parseFloat(data.amount) || 0;

  // Validate currency is valid
  if (!['INR', 'USD', 'RMB', 'EURO'].includes(data.currency)) {
    data.currency = 'INR';
  }

  // Ensure proper enum values for status
  if (data.status && !['accept', 'reject', 'hold', 'issue'].includes(data.status.toLowerCase())) {
    data.status = 'hold';
  }
  
  // Ensure proper enum values for siteStatus
  if (data.siteStatus && !['accept', 'reject'].includes(data.siteStatus.toLowerCase())) {
    data.siteStatus = null;
  }

  // Ensure proper enum values for accountsDept.status
  if (data['accountsDept.status'] && 
      !['paid', 'unpaid'].includes(data['accountsDept.status'].toLowerCase())) {
    data['accountsDept.status'] = 'unpaid';
  }

  // Convert Yes/No fields
  if (data.poCreated) {
    data.poCreated = data.poCreated.toLowerCase().includes('yes') ? 'Yes' : 'No';
  }

  // Fix amount mapping from taxInvAmt
  data.amount = parseAmount(data.taxInvAmt) || 0;

  // Fix date handling
  if (data.poDate) {
    data.poDate = parseDate(data.poDate);
  }
  if (data.taxInvDate) {
    data.taxInvDate = parseDate(data.taxInvDate);
  }

  // Region validation logic (dynamic)
  if (data.region) {
    const normalizedInput = data.region.trim();
    // Try to find the region in RegionMaster (case-insensitive)
    const regionDoc = await RegionMaster.findOne({ name: { $regex: `^${normalizedInput}$`, $options: "i" } });
    if (regionDoc) {
      data.region = regionDoc.name;
    } else {
      // If not found, fallback to default or leave as is
      data.region = "MUMBAI";
    }
  }

  // If payment date is set, auto-update payment status to paid
  if (data['accountsDept.paymentDate'] && data['accountsDept.paymentDate'] !== '') {
    data['accountsDept.status'] = 'paid';
  } else if (!data['accountsDept.status']) {
    // Default payment status is unpaid
    data['accountsDept.status'] = 'unpaid';
  }

  return data;
};

// Update headerMapping with exact Excel headers and fix issues with duplicates
export const headerMapping = {
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
  "Tax Inv Amt ": "taxInvAmt",  // Both versions with and without space
  "Tax Inv Recd at site": "taxInvRecdAtSite",
  "Tax Inv Recd by": "taxInvRecdBy",
  "Department": "department",
  "Remarks by Site Team": "remarksBySiteTeam",
  "Attachment": "attachment",
  "Attachment Type": "attachmentType",
  "Advance Dt": "advanceDate",
  "Advance Amt": "advanceAmt",
  "Advance Percentage": "advancePercentage",
  "Advance Percentage ": "advancePercentage",  // Both versions with and without space
  "Adv request entered by": "advRequestEnteredBy",
  "Dt given to Quality Engineer": "qualityEngineer.dateGiven",
  "Name of Quality Engineer": "qualityEngineer.name",
  "Dt given to QS for Inspection": "qsInspection.dateGiven",
  // QS Name fields will be handled dynamically in processing
  "Name of QS": "qsInspection.name", // Default mapping, will be overridden contextually when needed
  "Checked by QS with Dt of Measurment": "qsMeasurementCheck.dateGiven",
  "Checked  by QS with Dt of Measurment": "qsMeasurementCheck.dateGiven", // With extra space
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
  "Remarks ": "remarks", // With extra space
  "Dt given to Site Office for dispatch": "siteOfficeDispatch.dateGiven",
  "Name-Site Office": "siteOfficeDispatch.name",
  "Status": "status",
  "Dt given to PIMO Mumbai": "pimoMumbai.dateGiven",
  "Dt recd at PIMO Mumbai": "pimoMumbai.dateReceived",
  "Name recd by PIMO Mumbai": "pimoMumbai.receivedBy",
  "Dt given to QS Mumbai": "qsMumbai.dateGiven",
  "Name of QS": "qsMumbai.name", // This will be handled dynamically
  "Dt given to PIMO Mumbai ": "pimoMumbai.dateGivenPIMO", // With space
  "Name -PIMO": "pimoMumbai.namePIMO",
  "Dt given to IT Dept": "itDept.dateGiven",
  "Name- given to IT Dept": "itDept.name",
  "Name-given to PIMO": "pimoMumbai.namePIMO2",
  "SES no": "sesDetails.no",
  "SES Amt": "sesDetails.amount",
  "SES Dt": "sesDetails.date",
  "SES done by": "sesDetails.doneBy",
  "Dt recd from IT Deptt": "itDept.dateReceived",
  "Dt recd from PIMO": "pimoMumbai.dateReceivedFromPIMO",
  "Dt given to Director/Advisor/Trustee for approval": "approvalDetails.directorApproval.dateGiven",
  "Dt recd back in PIMO after approval": "approvalDetails.directorApproval.dateReceived",
  "Remarks PIMO Mumbai": "approvalDetails.remarksPimoMumbai",
  "Dt given to Accts dept": "accountsDept.dateGiven",
  "Name -given by PIMO office": "accountsDept.givenBy",
  "Dt recd in Accts dept": "accountsDept.dateReceived",
  "Name recd by Accts dept": "accountsDept.receivedBy",
  "Dt returned back to PIMO": "accountsDept.returnedToPimo",
  "Dt returned back to  PIMO": "accountsDept.returnedToPimo", // With extra space
  "Dt recd back in Accts dept": "accountsDept.receivedBack",
  "Inv given for booking and checking": "accountsDept.invBookingChecking",
  "Payment instructions": "accountsDept.paymentInstructions",
  "Remarks for pay instructions": "accountsDept.remarksForPayInstructions",
  "F110 Identification": "accountsDept.f110Identification",
  "Dt of Payment": "accountsDept.paymentDate",
  "Hard Copy": "accountsDept.hardCopy",
  "Accts Identification": "accountsDept.accountsIdentification",
  "Payment Amt": "accountsDept.paymentAmt",
  "Remarks Accts dept": "accountsDept.remarksAcctsDept",
  "Status": "accountsDept.status" // This will be handled dynamically
};

// Map to identify which "Name of QS" and "Status" field is which based on its position
export const contextBasedMapping = {
  // Maps a header to potential contextual fields around it
  "Dt given to QS for Inspection": { nextField: "Name of QS", mapping: "qsInspection.name" },
  "Given to vendor-Query/Final Inv": { nextField: "Name of QS", mapping: "vendorFinalInv.name" },
  "Dt given to QS for COP": { nextField: "Name - QS", mapping: "qsCOP.name" },
  "Name-Site Office": { nextField: "Status", mapping: "status" },
  "Dt given to QS Mumbai": { nextField: "Name of QS", mapping: "qsMumbai.name" },
  "Dt of Payment": { nextField: "Status", mapping: "accountsDept.status" }
};

// Global serial number tracking for import sessions
export const serialNumberTracking = {
  lastPrefixUsed: null,
  lastNumberUsed: 0,
  usedSerialNumbers: new Set()
};

// Helper: generate a unique serial number based on financial year prefix
export async function generateUniqueSerialNumber(prefix) {
  // Check if we already initialized the counter for this prefix
  if (serialNumberTracking.lastPrefixUsed !== prefix) {
    console.log(`Initializing serial number tracking for prefix: ${prefix}`);
    
    // Find the highest existing srNo with the given prefix
    const latestBill = await Bill.findOne({
      srNo: { $regex: `^${prefix}` }
    }).sort({ srNo: -1 });
    
    if (latestBill && latestBill.srNo) {
      // Extract numeric part (after the prefix)
      const numericPart = parseInt(latestBill.srNo.substring(prefix.length), 10);
      serialNumberTracking.lastNumberUsed = numericPart;
      console.log(`Found highest existing serial number: ${latestBill.srNo}, numeric part: ${numericPart}`);
    } else {
      // Start from 0 if no bills exist with this prefix
      serialNumberTracking.lastNumberUsed = 0;
      console.log(`No existing bills found with prefix ${prefix}, starting from 0`);
    }
    
    serialNumberTracking.lastPrefixUsed = prefix;
    // Clear the used numbers set when switching to a new prefix
    serialNumberTracking.usedSerialNumbers.clear();
  }

  // Generate next number
  let nextNumber = serialNumberTracking.lastNumberUsed + 1;
  let serialNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;
  
  // Ensure it's not already used in this batch
  while (serialNumberTracking.usedSerialNumbers.has(serialNumber)) {
    nextNumber++;
    serialNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;
    console.log(`Serial number collision detected, trying next number: ${serialNumber}`);
  }
  
  // Update tracking
  serialNumberTracking.lastNumberUsed = nextNumber;
  serialNumberTracking.usedSerialNumbers.add(serialNumber);
  
  console.log(`Generated unique serial number: ${serialNumber}`);
  return serialNumber;
}
