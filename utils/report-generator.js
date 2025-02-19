import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import xml2js from "xml2js";
import Bill from "../models/bill-model.js";

// Define comprehensive columns for both Excel and PDF
const reportColumns = {
  essential: [
    { header: "Bill ID", key: "_id", width: 30 },
    { header: "Invoice Type", key: "typeOfInv", width: 20 },
    { header: "Project Description", key: "projectDescription", width: 30 },
    { header: "Vendor Name", key: "vendorName", width: 25 },
    { header: "Amount", key: "amount", width: 15 },
    { header: "Bill Date", key: "billDate", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Region", key: "region", width: 20 },
    { header: "Nature of Work", key: "natureOfWork", width: 25 }
  ],
  detailed: [
    { header: "PO Number", key: "poNo", width: 20 },
    { header: "PO Amount", key: "poAmt", width: 15 },
    { header: "Tax Invoice No", key: "taxInvNo", width: 20 },
    { header: "Tax Invoice Amount", key: "taxInvAmt", width: 20 },
    { header: "Department", key: "department", width: 20 },
    { header: "GST Number", key: "gstNumber", width: 25 },
    { header: "Currency", key: "currency", width: 15 }
  ]
};

// Helper function to format values
const formatValue = (value, key) => {
  if (!value) return "";
  
  switch (key) {
    case "billDate":
    case "poDate":
    case "taxInvDate":
      return new Date(value).toLocaleDateString();
    case "amount":
    case "poAmt":
    case "taxInvAmt":
      return value.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
      });
    default:
      return value.toString();
  }
};

// XML Parser for Excel upload
export const parseExcelXML = async (xmlString) => {
  const parser = new xml2js.Parser({ explicitArray: false });
  try {
    const result = await parser.parseStringPromise(xmlString);
    // Assuming the XML structure has a root element and rows
    const rows = result.Workbook.Worksheet.Table.Row;
    
    // Map XML data to bill schema
    return rows.map(row => {
      const cells = row.Cell;
      return {
        typeOfInv: cells[0]?.Data?._,
        projectDescription: cells[1]?.Data?._,
        vendorName: cells[2]?.Data?._,
        amount: parseFloat(cells[3]?.Data?._ || 0),
        // Add more mappings as needed
      };
    }).filter(bill => bill.typeOfInv); // Filter out empty rows
  } catch (error) {
    throw new Error(`Failed to parse XML: ${error.message}`);
  }
};

export const generateExcelReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  if (!bills.length) {
    throw new Error("No bills found for the provided IDs");
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bills Report");
  
  // Combine essential and detailed columns for Excel
  const allColumns = [...reportColumns.essential, ...reportColumns.detailed];
  worksheet.columns = allColumns;

  // Style header row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, size: 12 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB0C4DE' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add data rows with formatting
  bills.forEach((bill) => {
    const rowData = {};
    allColumns.forEach(col => {
      rowData[col.key] = formatValue(bill[col.key], col.key);
    });
    worksheet.addRow(rowData);
  });

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip header
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = Math.max(column.width, 15);
  });

  return await workbook.xlsx.writeBuffer();
};

export const generatePDFReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  if (!bills.length) {
    throw new Error("No bills found for the provided IDs");
  }

  const doc = new PDFDocument({ 
    margin: 40, 
    size: "A4", 
    layout: "landscape"
  });

  let buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  const endPromise = new Promise(resolve => doc.on("end", resolve));

  // Add header with company logo/name if needed
  doc.fontSize(20).text("Bills Report", { align: "center" });
  doc.moveDown(1);

  // Use only essential columns for PDF to keep it concise
  const columns = reportColumns.essential;
  
  // Calculate dimensions
  const pageWidth = doc.page.width - 80;
  const columnWidth = pageWidth / columns.length;
  const startX = 40;
  let startY = 100;

  // Draw header
  doc.fontSize(12).font("Helvetica-Bold");
  columns.forEach((col, i) => {
    doc.text(
      col.header,
      startX + (i * columnWidth),
      startY,
      { width: columnWidth, align: "center" }
    );
  });

  // Draw header line
  startY += 20;
  doc.moveTo(startX, startY).lineTo(startX + pageWidth, startY).stroke();

  // Draw data rows
  doc.fontSize(10).font("Helvetica");
  bills.forEach((bill, rowIndex) => {
    startY += 5;
    
    // Check if we need a new page
    if (startY > doc.page.height - 50) {
      doc.addPage();
      startY = 50;
    }

    columns.forEach((col, i) => {
      const value = formatValue(bill[col.key], col.key);
      doc.text(
        value,
        startX + (i * columnWidth),
        startY,
        { width: columnWidth, align: "center" }
      );
    });

    startY += 20;
    doc.moveTo(startX, startY)
       .lineTo(startX + pageWidth, startY)
       .strokeColor("#dddddd")
       .stroke();
  });

  doc.end();
  await endPromise;
  return Buffer.concat(buffers);
};