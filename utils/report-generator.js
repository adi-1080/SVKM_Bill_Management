import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import Bill from "../models/bill-model.js";

// Utility to flatten bill object with nested fields
const flattenBill = (bill) => {
  const flatten = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix ? `${prefix}.` : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !(obj[k] instanceof Date)) {
        Object.assign(acc, flatten(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };
  
  const { _id, ...rest } = bill;
  return flatten(rest);
};

// Excel Report - All Fields with improved formatting
export const generateExcelReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  console.log("Total bills : ", bills.length);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bills Report");

  // Generate dynamic columns with improved headers
  const sample = flattenBill(bills[0]);
  const columns = Object.keys(sample).map(key => ({
    header: key.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    key,
    width: Math.min(Math.max(key.length * 1.8, 20), 35) // Increased width for better readability
  }));

  worksheet.columns = columns;

  // Enhanced header styling
  worksheet.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add data with improved formatting
  bills.forEach((bill, index) => {
    const flatBill = flattenBill(bill);
    const row = worksheet.addRow(Object.values(flatBill).map(value => 
      typeof value === 'number' && !Number.isInteger(value) ? 
      Number(value.toFixed(2)) : 
      value
    ));

    // Alternate row colors for better readability
    if (index % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });

  // Enhanced cell formatting
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };

        if (typeof cell.value === 'number') {
          cell.numFmt = cell.value % 1 === 0 ? '#,##0' : '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (cell.value instanceof Date) {
          cell.numFmt = 'dd-mmm-yyyy';
        }
      });
    }
  });

  return workbook.xlsx.writeBuffer();
};

// PDF Report - One bill per page with improved layout
export const generatePDFReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  console.log("Total bills : ", bills.length);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  const endPromise = new Promise(resolve => doc.on('end', resolve));

  const drawBill = (bill) => {
    // Header
    doc.rect(50, 50, doc.page.width - 100, 60)
       .fillAndStroke('#F8F8F8', '#CCCCCC');
    
    doc.fontSize(16)
       .fillColor('#1F497D')
       .font('Helvetica-Bold')
       .text(`Bill Details: ${bill.typeOfInv}`, 70, 70);

    // Status badge
    const status = bill.status?.toUpperCase() || 'N/A';
    const statusColor = status === 'PAID' ? '#00B050' : '#FFC000';
    const statusWidth = doc.widthOfString(status) + 40;
    doc.rect(doc.page.width - statusWidth - 70, 70, statusWidth, 24)
       .fillAndStroke(statusColor, statusColor);
    doc.fontSize(12)
       .fillColor('#FFFFFF')
       .text(status, doc.page.width - statusWidth - 50, 75);

    // Main content layout
    const startY = 140;
    const col1X = 70;
    const col2X = doc.page.width / 2 + 20;
    let currentY = startY;

    // Section styling
    const section = (title, fields) => {
      doc.fontSize(14)
         .fillColor('#1F497D')
         .font('Helvetica-Bold')
         .text(title, col1X, currentY);
      currentY += 30;

      fields.forEach(([label, value]) => {
        const formattedValue = formatValue(value);
        
        // Left column
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text(label + ':', col1X, currentY, { continued: true })
           .font('Helvetica')
           .text(' ' + formattedValue, { width: 200 });

        currentY += 25;
      });
      currentY += 20;
    };

    // Sections with single column layout for clarity
    section('Vendor Information', [
      ['Name', bill.vendorName],
      ['GST Number', bill.gstNumber],
      ['PO Number', bill.poNo],
      ['Department', bill.department]
    ]);

    section('Financial Details', [
      ['PO Amount', formatCurrency(bill.poAmt)],
      ['Tax Invoice Amount', formatCurrency(bill.taxInvAmt)],
      ['Advance Amount', formatCurrency(bill.advanceAmt)],
      ['Total Amount', formatCurrency(bill.amount)]
    ]);

    section('Key Dates', [
      ['Bill Date', formatDate(bill.billDate)],
      ['Payment Date', formatDate(bill.accountsDept?.paymentDate)],
      ['MIGO Date', formatDate(bill.migoDetails?.date)],
      ['Approval Date', formatDate(bill.approvalDetails?.directorApproval?.dateGiven)]
    ]);

    section('Process Status', [
      ['Quality Engineer', bill.qualityEngineer?.name],
      ['QS Inspection', bill.qsInspection?.name],
      ['Final Approval', bill.approvalDetails?.directorApproval?.status],
      ['Payment Status', bill.accountsDept?.status]
    ]);
  };

  bills.forEach((bill, index) => {
    if (index > 0) {
      doc.addPage();
    }
    drawBill(bill);
  });

  doc.end();
  await endPromise;
  return Buffer.concat(buffers);
};

// Enhanced formatting helpers
const formatCurrency = (value) => {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return formatCurrency(value);
  if (value instanceof Date) return formatDate(value);
  return value.toString();
};