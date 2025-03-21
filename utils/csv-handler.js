import fs from 'fs';
import { Parser } from 'json2csv';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import Bill from "../models/bill-model.js";
import os from 'os';
import path from 'path';
import mongoose from "mongoose";

// Complete fields array matching Excel columns
const fields = [
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
const unflattenData = (data) => {
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
const flattenDoc = (doc, path = '') => {
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
const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // Handle Excel date format (DD-MM-YYYY)
  const ddmmyyyyRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddmmyyyyMatch = typeof dateString === 'string' ? dateString.match(ddmmyyyyRegex) : null;
  
  if (ddmmyyyyMatch) {
    const [_, day, month, year] = ddmmyyyyMatch;
    // Month is 0-indexed in JavaScript Date
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Parsed date from DD-MM-YYYY format: ${dateString} → ${date.toISOString().split('T')[0]}`);
      return date;
    }
  }
  
  // Try to parse other date formats
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  console.log(`Failed to parse date: ${dateString}`);
  return null;
};

// Helper: convert amount strings to numbers
const parseAmount = (value) => {
  if (!value) return 0;
  // Remove currency symbols, commas and spaces
  const cleaned = value.toString().replace(/[₹,$€¥\s,]/g, '').trim();
  return parseFloat(cleaned) || 0;
};

// Helper: convert strings to appropriate types
const convertTypes = (data) => {
  const typeConverters = {
    // Numeric fields
    "poAmt": (val) => parseAmount(val),
    "proformaInvAmt": (val) => parseAmount(val),
    "taxInvAmt": (val) => parseAmount(val),
    "advanceAmt": (val) => parseAmount(val),
    "advancePercentage": (val) => parseFloat(val) || 0,
    "copDetails.amount": (val) => parseAmount(val),
    "migoDetails.amount": (val) => parseAmount(val),
    "sesDetails.amount": (val) => parseFloat(val) || 0,
    "accountsDept.paymentAmt": (val) => parseFloat(val) || 0,
    
    // Date fields
    "poDate": parseDate,
    "proformaInvDate": parseDate,
    "proformaInvRecdAtSite": parseDate,
    "taxInvDate": parseDate,
    "taxInvRecdAtSite": parseDate,
    "advanceDate": parseDate,
    "qualityEngineer.dateGiven": parseDate,
    "qsInspection.dateGiven": parseDate,
    "qsMeasurementCheck.dateGiven": parseDate,
    "vendorFinalInv.dateGiven": parseDate,
    "qsCOP.dateGiven": parseDate,
    "copDetails.date": parseDate,
    "migoDetails.date": parseDate,
    "invReturnedToSite": parseDate,
    "siteEngineer.dateGiven": parseDate,
    "architect.dateGiven": parseDate,
    "siteIncharge.dateGiven": parseDate,
    "siteOfficeDispatch.dateGiven": parseDate,
    "billDate": parseDate,
    "pimoMumbai.dateGiven": parseDate,
    "pimoMumbai.dateReceived": parseDate,
    "qsMumbai.dateGiven": parseDate,
    "itDept.dateGiven": parseDate,
    "sesDetails.date": parseDate,
    "approvalDetails.directorApproval.dateGiven": parseDate,
    "approvalDetails.directorApproval.dateReceived": parseDate,
    "accountsDept.dateGiven": parseDate,
    "accountsDept.dateReceived": parseDate,
    "accountsDept.returnedToPimo": parseDate,
    "accountsDept.receivedBack": parseDate,
    "accountsDept.paymentDate": parseDate,
    // Add new date converters
    "migoDetails.dateGiven": parseDate,
    "pimoMumbai.dateGivenPIMO": parseDate,
    "pimoMumbai.dateGivenPIMO2": parseDate,
    "pimoMumbai.dateReceivedFromPIMO": parseDate
  };

  Object.keys(data).forEach(key => {
    if (typeConverters[key] && data[key] !== undefined && data[key] !== null && data[key] !== '') {
      data[key] = typeConverters[key](data[key]);
    }
  });

  // Convert Yes/No to proper format
  if (data.poCreated) {
    data.poCreated = data.poCreated.toLowerCase().includes('yes') ? 'Yes' : 'No';
  }

  // Convert status to proper enum value
  if (data.status) {
    const statusMap = {
      'accept': 'accept',
      'reject': 'reject',
      'hold': 'hold',
      'issue': 'issue'
    };
    data.status = statusMap[data.status.toLowerCase()] || data.status;
  }

  // Convert accountsDept.status to proper enum value (paid/unpaid)
  if (data['accountsDept.status']) {
    // Convert any variation of "paid" to lowercase "paid"
    data['accountsDept.status'] = 
      data['accountsDept.status'].toLowerCase().includes('paid') ? 'paid' : 'unpaid';
  }

  return data;
};

// Import bills from a CSV file and load data into the model
export const importBillsFromCSV = async (filePath, validVendorNos = []) => {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rows = fileContent.split('\n');
    
    // Get headers from the second line (skip the numbering row)
    const headers = rows[1].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    console.log('CSV Headers:', headers);
    
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
        console.log(`Vendor not found: ${vendorNo} in row ${i} - skipping`);
        nonExistentVendors.push({ srNo, vendorNo, rowNumber: i });
        continue; // Skip this row
      }
      
      // Add default fields needed for MongoDB
      rowData.billDate = rowData.taxInvDate || new Date().toISOString().split('T')[0];
      rowData.amount = rowData.taxInvAmt || 0;
      rowData.natureOfWork = rowData.typeOfInv || "Others";
      rowData.vendor = new mongoose.Types.ObjectId();

      // Convert types
      const typedData = convertTypes(rowData);
      const validatedData = validateRequiredFields(typedData);
      const processedData = unflattenData(validatedData);
      
      console.log(`Processed row ${i}:`, processedData);
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

// Update headerMapping with exact Excel headers and fix issues with duplicates
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
const contextBasedMapping = {
  // Maps a header to potential contextual fields around it
  "Dt given to QS for Inspection": { nextField: "Name of QS", mapping: "qsInspection.name" },
  "Given to vendor-Query/Final Inv": { nextField: "Name of QS", mapping: "vendorFinalInv.name" },
  "Dt given to QS for COP": { nextField: "Name - QS", mapping: "qsCOP.name" },
  "Name-Site Office": { nextField: "Status", mapping: "status" },
  "Dt given to QS Mumbai": { nextField: "Name of QS", mapping: "qsMumbai.name" },
  "Dt of Payment": { nextField: "Status", mapping: "accountsDept.status" }
};

// Add validation function for required fields with defaults
const validateRequiredFields = (data) => {
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

  // ADD THIS NEW SINGLE REGION VALIDATION LOGIC
  // This should be the only region validation block in the function
  if (data.region) {
    console.log(`Region before mapping: "${data.region}"`);
    
    const validRegions = [
      "MUMBAI", "KHARGHAR", "AHMEDABAD", "BANGALURU", "BHUBANESHWAR",
      "CHANDIGARH", "DELHI", "NOIDA", "NAGPUR", "GANSOLI", "HOSPITAL",
      "DHULE", "SHIRPUR", "INDORE", "HYDERABAD"
    ];
    
    // Special case direct mappings
    const directMappings = {
      "shirpur": "SHIRPUR",
      "ahmedabad": "AHMEDABAD",
      "mumbai": "MUMBAI",
      "chandigarh": "CHANDIGARH",
      "delhi": "DELHI",
      "noida": "NOIDA",
      "nagpur": "NAGPUR",
      "indore": "INDORE",
      "hyderabad": "HYDERABAD",
      "dhule": "DHULE",
      "kharghar": "KHARGHAR"
    };
    
    // Try direct mapping first (case insensitive)
    const normalizedInput = data.region.trim().toLowerCase();
    if (directMappings[normalizedInput]) {
      data.region = directMappings[normalizedInput];
      console.log(`Direct region mapping: "${normalizedInput}" → "${data.region}"`);
    } else {
      // Try exact case-insensitive match with validRegions
      const exactMatch = validRegions.find(r => r.toLowerCase() === normalizedInput);
      if (exactMatch) {
        data.region = exactMatch;
        console.log(`Exact region match: "${normalizedInput}" → "${data.region}"`);
      } else {
        // Try partial matches as fallback
        const partialMatches = validRegions.filter(r => 
          r.toLowerCase().includes(normalizedInput) || 
          normalizedInput.includes(r.toLowerCase())
        );
        
        if (partialMatches.length > 0) {
          data.region = partialMatches[0];
          console.log(`Partial region match: "${normalizedInput}" → "${data.region}"`);
        } else {
          console.log(`No region match for "${normalizedInput}", defaulting to MUMBAI`);
          data.region = "MUMBAI"; // Default if no match
        }
      }
    }
    
    console.log(`Final region value: "${data.region}"`);
  }

  // If payment date is set, auto-update payment status to paid
  if (data['accountsDept.paymentDate'] && data['accountsDept.paymentDate'] !== '') {
    data['accountsDept.status'] = 'paid';
    console.log('Auto-updated payment status to PAID based on payment date');
  } else if (!data['accountsDept.status']) {
    // Default payment status is unpaid
    data['accountsDept.status'] = 'unpaid';
  }

  return data;
};

// Update importBillsFromExcel function to support better field mapping
export const importBillsFromExcel = async (filePath, validVendorNos = []) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error("No worksheet found in the Excel file");
    }
    
    // Log vendor validation status
    console.log(`Vendor validation enabled: ${validVendorNos.length > 0}`);
    console.log(`Valid vendor numbers available: ${validVendorNos.length}`);
    if (validVendorNos.length > 0) {
      console.log(`First few valid vendor numbers: ${validVendorNos.slice(0, 5).join(', ')}${validVendorNos.length > 5 ? '...' : ''}`);
    } else {
      console.log('WARNING: No valid vendor numbers provided, vendor validation will be skipped');
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
      console.log(`Column ${colNumber}: "${headerText}"`);
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
          console.log(`Mapped contextual field ${headers[nextPosition]} at position ${nextPosition} to ${config.mapping}`);
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
    
    console.log(`Found ${existingBills.length} existing bills by Sr No in the database`);
    console.log(`Using ${validVendorNos.length} valid vendors for validation`);
    
    for (let rowNumber = startRowIndex; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = {};
      
      // Skip empty rows or rows with no value in first cell
      if (!row.getCell(1).value) continue;
      
      let isEmpty = true;
      let srNo = null;
      let vendorNo = null;
      
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
        
        // Store vendorNo for validation
        if (fieldName === 'vendorNo') {
          vendorNo = String(value || '').trim();
          console.log(`Found vendorNo in row ${rowNumber}: "${vendorNo}"`);
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
          // Check if vendor exists - strict validation
          if (vendorNo && validVendorNos.length > 0) {
            const isValidVendor = validVendorNos.includes(vendorNo);
            console.log(`Vendor validation for ${vendorNo}: ${isValidVendor ? 'VALID' : 'INVALID'}`);
            
            if (!isValidVendor) {
              console.log(`Vendor not found: ${vendorNo} in row ${rowNumber} - skipping`);
              nonExistentVendors.push({ srNo, vendorNo, rowNumber });
              continue; // Skip this row
            }
          } else {
            console.log(`Row ${rowNumber}: Vendor validation skipped for "${vendorNo}" - no validation list provided`);
          }
          
          // Add default fields needed for MongoDB
          rowData.billDate = rowData.taxInvDate || new Date();
          rowData.amount = rowData.taxInvAmt || 0;
          rowData.natureOfWork = rowData.typeOfInv || "Others";
          rowData.vendor = new mongoose.Types.ObjectId(); // Will be replaced for updates
          
          const typedData = convertTypes(rowData);
          const validatedData = validateRequiredFields(typedData);
          
          console.log(`Processed row ${rowNumber}: srNo=${srNo}, vendorNo=${vendorNo}`);
          
          // Check if this is an update or new insert
          if (existingSrNos.includes(Number(srNo))) {
            const existingBill = existingBillsBySrNo[Number(srNo)];
            console.log(`Found existing bill for Sr No ${srNo}`);
            
            // Merge data - don't overwrite non-null DB values with null Excel values
            const mergedData = mergeWithExisting(existingBill, validatedData);
            toUpdate.push({ 
              _id: existingBill._id, 
              data: unflattenData(mergedData) 
            });
          } else {
            // New insert - only if vendor validation was not enabled or passed
            const unflattened = unflattenData(validatedData);
            toInsert.push(unflattened);
            console.log(`Prepared for insertion: srNo=${srNo}, vendorNo=${vendorNo}`);
          }
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          throw new Error(`Row ${rowNumber}: ${error.message}`);
        }
      }
    }
    
    // Process inserts and updates
    console.log(`Processing ${toInsert.length} inserts and ${toUpdate.length} updates`);
    
    // Handle inserts
    let inserted = [];
    if (toInsert.length > 0) {
      inserted = await Bill.insertMany(toInsert);
      console.log(`Successfully inserted ${inserted.length} new bills`);
    }
    
    // Handle updates
    const updated = [];
    for (const item of toUpdate) {
      const result = await Bill.findByIdAndUpdate(
        item._id,
        { $set: item.data },
        { new: true }
      );
      if (result) updated.push(result);
    }
    console.log(`Successfully updated ${updated.length} existing bills`);
    
    return {
      inserted,
      updated,
      nonExistentVendors,
      totalProcessed: inserted.length + updated.length,
      totalSkipped: nonExistentVendors.length
    };
    
  } catch (error) {
    console.error('Excel import error:', error);
    throw error;
  }
};

// Improved helper function to merge data without overwriting non-null DB values with null Excel values
const mergeWithExisting = (existingData, newData) => {
  const result = { ...existingData };
  
  // Flatten existing data for easier comparison
  const flatExisting = flattenDoc(existingData);
  
  // Only update fields that have values in the new data
  Object.keys(newData).forEach(key => {
    // Don't overwrite existing non-null values with null/empty Excel values
    if (newData[key] !== null && newData[key] !== undefined && newData[key] !== '') {
      result[key] = newData[key];
    } else if (flatExisting[key] === undefined) {
      // If field doesn't exist in DB but is null in Excel, add it to maintain field existence
      result[key] = null;
    }
  });
  
  return result;
};

// Helper: create a temporary file path
export const createTempFilePath = (prefix, extension) => {
  const tempDir = os.tmpdir();
  const fileName = `${prefix}-${Date.now()}.${extension}`;
  return path.join(tempDir, fileName);
};