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
  
  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (!isNaN(date.getTime())) {
    return date;
  }
  
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
export const importBillsFromCSV = async (filePath) => {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rows = fileContent.split('\n');
    
    // Get headers from the second line (skip the numbering row)
    const headers = rows[1].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    console.log('CSV Headers:', headers);
    
    // Process data rows
    const results = [];
    
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
      results.push(processedData);
    }
    
    // Insert into database
    const inserted = await Bill.insertMany(results);
    return inserted;
    
  } catch (error) {
    console.error('CSV import error:', error);
    throw error;
  }
};

// Update headerMapping with exact Excel headers
const headerMapping = {
  "Sr no": "srNo",
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
  "Tax Inv Amt ": "taxInvAmt", // Note the space after "Amt"
  "Tax Inv Recd at site": "taxInvRecdAtSite",
  "Tax Inv Recd by": "taxInvRecdBy",
  "Department": "department",
  "Remarks by Site Team": "remarksBySiteTeam",
  "Attachment": "attachment",
  "Attachment Type": "attachmentType",
  "Advance Dt": "advanceDate",
  "Advance Amt": "advanceAmt",
  "Advance Percentage ": "advancePercentage", // Note the space
  "Adv request entered by": "advRequestEnteredBy",
  "Dt given to Quality Engineer": "qualityEngineer.dateGiven",
  "Name of Quality Engineer": "qualityEngineer.name",
  "Dt given to QS for Inspection": "qsInspection.dateGiven",
  "Name of QS": "qsInspection.name",
  "Checked  by QS with Dt of Measurment": "qsMeasurementCheck.dateGiven",
  "Given to vendor-Query/Final Inv": "vendorFinalInv.dateGiven",
  "Name of QS": "vendorFinalInv.name", 
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
  "Remarks ": "remarks",
  "Dt given to Site Office for dispatch": "siteOfficeDispatch.dateGiven",
  "Name-Site Office": "siteOfficeDispatch.name",
  "Status": "status",
  "Dt given to PIMO Mumbai": "pimoMumbai.dateGiven",
  "Dt recd at PIMO Mumbai": "pimoMumbai.dateReceived",
  "Name recd by PIMO Mumbai": "pimoMumbai.receivedBy",
  "Dt given to QS Mumbai": "qsMumbai.dateGiven",
  "Name of QS": "qsMumbai.name",
  "Dt given to PIMO Mumbai ": "pimoMumbai.dateGivenPIMO",
  "Name -PIMO": "pimoMumbai.namePIMO",
  "Dt given to IT Dept": "itDept.dateGiven",
  "Name- given to IT Dept": "itDept.name",
  "Dt given to PIMO Mumbai": "pimoMumbai.dateGivenPIMO2",
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
  "Dt returned back to  PIMO": "accountsDept.returnedToPimo",
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
  "Status": "accountsDept.status"
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

  return data;
};

// Update importBillsFromExcel function
export const importBillsFromExcel = async (filePath) => {
  try {
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
    worksheet.getRow(headerRowIndex).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerText = cell.value?.toString().trim();
      headers[colNumber - 1] = headerText;
      console.log(`Column ${colNumber}: "${headerText}"`);
    });
    
    // Process data rows
    const results = [];
    const startRowIndex = headerRowIndex + 1;
    
    for (let rowNumber = startRowIndex; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = {};
      
      // Skip empty rows or rows with no value in first cell
      if (!row.getCell(1).value) continue;
      
      let isEmpty = true;
      
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        isEmpty = false;
        const header = headers[colNumber - 1];
        if (!header) return; // Skip cells with no header
        
        const fieldName = headerMapping[header] || header;
        let value = cell.value;
        
        // Handle different cell types
        if (cell.type === ExcelJS.ValueType.Date) {
          value = cell.value.toISOString().split('T')[0];
        } else if (typeof value === 'object' && value !== null) {
          value = value.text || value.result || value.toString();
        }
        
        rowData[fieldName] = value;
        
        // Special handling for region to preserve original value
        if (fieldName === 'region' && value) {
          console.log(`Found raw region in Excel row ${rowNumber}: "${value}"`);
        }
      });
      
      if (!isEmpty) {
        try {
          // Add default fields needed for MongoDB
          rowData.billDate = rowData.taxInvDate || new Date().toISOString().split('T')[0];
          rowData.amount = rowData.taxInvAmt || 0;
          rowData.natureOfWork = rowData.typeOfInv || "Others";
          rowData.vendor = new mongoose.Types.ObjectId();
          
          const typedData = convertTypes(rowData);
          const validatedData = validateRequiredFields(typedData);
          const processedData = unflattenData(validatedData);
          
          // Process special case fields
          // Convert Payment status to lowercase for enum validation
          if (rowData['accountsDept.status']) {
            rowData['accountsDept.status'] = 
              rowData['accountsDept.status'].toLowerCase().includes('paid') ? 'paid' : 'unpaid';
          }
          
          console.log(`Processed Excel row ${rowNumber}:`, JSON.stringify(processedData).substring(0, 200) + '...');
          results.push(processedData);
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          throw new Error(`Row ${rowNumber}: ${error.message}`);
        }
      }
    }
    
    console.log(`Processing ${results.length} Excel rows`);
    const inserted = await Bill.insertMany(results);
    return inserted;
    
  } catch (error) {
    console.error('Excel import error:', error);
    throw error;
  }
};

// Helper: create a temporary file path
export const createTempFilePath = (prefix, extension) => {
  const tempDir = os.tmpdir();
  const fileName = `${prefix}-${Date.now()}.${extension}`;
  return path.join(tempDir, fileName);
};