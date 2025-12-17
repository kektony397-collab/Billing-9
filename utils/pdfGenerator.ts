
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, CompanyProfile, InvoiceItem } from '../types';
import { db } from '../db';

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number): string => {
    if (n === 0) return '';
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += '-' + a[n % 10].trim();
      }
    }
    return str.trim() + ' ';
  };

  if (num === 0) return 'Zero Rupees Only';
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = 'Rupees ' + inWords(integerPart);
  if (decimalPart > 0) {
    result += 'and ' + inWords(decimalPart) + 'Paise ';
  }
  return result + 'Only';
};

export const generateInvoicePDF = async (invoice: Invoice, template: string = 'standard') => {
  const profile = await db.settings.get(1);
  if (!profile) return;

  // Use Landscape for high-column density
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;

  // Outer Border
  doc.setLineWidth(0.2);
  doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

  // --- Top Header ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN No. ${profile.gstin}`, margin + 2, margin + 5);
  doc.text('TAX INVOICE', pageWidth / 2, margin + 5, { align: 'center' });
  doc.text('Duplicate Copy', pageWidth - margin - 2, margin + 5, { align: 'right' });

  doc.line(margin, margin + 7, pageWidth - margin, margin + 7);

  // --- Company Info ---
  doc.setFontSize(18);
  doc.text(profile.companyName, pageWidth / 2, margin + 14, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profile.addressLine1}, ${profile.addressLine2}`, pageWidth / 2, margin + 19, { align: 'center' });
  
  const dlStr = `(${profile.dlNo1 || ''}) (${profile.dlNo2 || ''}) (${profile.dlNo3 || ''}) (${profile.dlNo4 || ''})`.replace(/\(\) /g, '').trim();
  doc.text(dlStr, pageWidth / 2, margin + 24, { align: 'center' });

  // Phone and Terms (Right Side)
  doc.setFontSize(8);
  doc.text(profile.phone.split(',')[0], pageWidth - margin - 5, margin + 14, { align: 'right' });
  if (profile.phone.split(',')[1]) doc.text(profile.phone.split(',')[1].trim(), pageWidth - margin - 5, margin + 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS :  Credit', pageWidth - margin - 5, margin + 24, { align: 'right' });

  doc.line(margin, margin + 28, pageWidth - margin, margin + 28);

  // --- Purchaser & Invoice Details Grid ---
  const gridTop = margin + 28;
  const midPoint = (pageWidth / 2) + 20;

  // Vertical Separator
  doc.line(midPoint, gridTop, midPoint, gridTop + 35);

  // Left side: Purchaser
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("Purchaser's Name and Address", margin + 2, gridTop + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.partyName, margin + 2, gridTop + 9);
  doc.setFontSize(7.5);
  doc.text(invoice.partyAddress || '', margin + 2, gridTop + 14, { maxWidth: 90 });
  doc.text(`State : `, margin + 2, gridTop + 24);
  doc.text(`Contact No. : `, margin + 2, gridTop + 28);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN : ${invoice.partyGstin || ''}`, margin + 2, gridTop + 33);

  // Right side: Invoice Details
  doc.setFontSize(8);
  doc.text(`INVOICE NO. ${invoice.invoiceNo}`, midPoint + 2, gridTop + 5);
  doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - margin - 2, gridTop + 5, { align: 'right' });
  
  doc.line(midPoint, gridTop + 8, pageWidth - margin, gridTop + 8);
  doc.text(`GR No.`, midPoint + 2, gridTop + 13);
  
  doc.line(midPoint, gridTop + 17, pageWidth - margin, gridTop + 17);
  doc.text(`Vehicle No.`, midPoint + 2, gridTop + 22);

  doc.line(midPoint, gridTop + 26, pageWidth - margin, gridTop + 26);
  doc.setFontSize(7);
  doc.text(`State Code`, midPoint + 2, gridTop + 31);
  doc.line(midPoint + 15, gridTop + 26, midPoint + 15, gridTop + 35); // small box for state code
  doc.text(invoice.partyGstin?.substring(0, 2) || '24', midPoint + 18, gridTop + 31);
  doc.line(midPoint + 35, gridTop + 26, midPoint + 35, gridTop + 35);
  doc.text(`TRANSPORT`, midPoint + 37, gridTop + 31);
  doc.text(invoice.transport || '', midPoint + 60, gridTop + 31);

  // --- Main Table ---
  const tableTop = gridTop + 35;
  
  const headers = [
    ['S.N', 'ITEM DESCRIPTION', 'Batch', 'Exp', 'HSN CODE', 'OLD M.R.P', 'NEW M.R.P', 'QTY', 'Fr. Qty', 'RATE', 'Total Value', 'Discount', '', 'Taxable Amt.', 'SGST', '', 'CGST', '', 'IGST', '', 'TOTAL'],
    ['', '', '', '', '', '', '', '', '', '', '', '%', 'Amt', '', '%', 'Amt', '%', 'Amt', '%', 'Amt', '']
  ];

  const body = invoice.items.map((item, idx) => {
    const totalVal = item.saleRate * item.quantity;
    const discAmt = (totalVal * item.discountPercent) / 100;
    return [
      idx + 1,
      item.name,
      item.batch,
      item.expiry,
      item.hsn,
      (item.oldMrp || item.mrp).toFixed(2),
      item.mrp.toFixed(2),
      item.quantity,
      item.freeQuantity || 0,
      item.saleRate.toFixed(2),
      totalVal.toFixed(2),
      item.discountPercent.toFixed(2),
      discAmt.toFixed(2),
      item.taxableValue.toFixed(2),
      (item.igstAmount > 0 ? '' : (item.gstRate / 2).toFixed(1)),
      (item.igstAmount > 0 ? '' : item.sgstAmount.toFixed(2)),
      (item.igstAmount > 0 ? '' : (item.gstRate / 2).toFixed(1)),
      (item.igstAmount > 0 ? '' : item.cgstAmount.toFixed(2)),
      (item.igstAmount > 0 ? item.gstRate.toFixed(1) : ''),
      (item.igstAmount > 0 ? item.igstAmount.toFixed(2) : ''),
      item.totalAmount.toFixed(2)
    ];
  });

  autoTable(doc, {
    startY: tableTop,
    head: headers,
    body: body,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 7 }, // SN
      1: { cellWidth: 35 }, // Description
      2: { cellWidth: 15 }, // Batch
      3: { cellWidth: 12 }, // Exp
      4: { cellWidth: 12 }, // HSN
      5: { cellWidth: 12, halign: 'right' }, // Old MRP
      6: { cellWidth: 12, halign: 'right' }, // New MRP
      7: { cellWidth: 8, halign: 'center' }, // Qty
      8: { cellWidth: 8, halign: 'center' }, // Free Qty
      9: { cellWidth: 12, halign: 'right' }, // Rate
      10: { cellWidth: 15, halign: 'right' }, // Total Val
      11: { cellWidth: 8, halign: 'center' }, // Disc %
      12: { cellWidth: 12, halign: 'right' }, // Disc Amt
      13: { cellWidth: 15, halign: 'right' }, // Taxable
      14: { cellWidth: 8, halign: 'center' }, // SGST %
      15: { cellWidth: 12, halign: 'right' }, // SGST Amt
      16: { cellWidth: 8, halign: 'center' }, // CGST %
      17: { cellWidth: 12, halign: 'right' }, // CGST Amt
      18: { cellWidth: 8, halign: 'center' }, // IGST %
      19: { cellWidth: 12, halign: 'right' }, // IGST Amt
      20: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, // Total
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // --- HSN Summary Table ---
  const hsnGroups = invoice.items.reduce((acc, item) => {
    if (!acc[item.hsn]) acc[item.hsn] = { taxable: 0, sgst: 0, cgst: 0, igst: 0, rate: item.gstRate };
    acc[item.hsn].taxable += item.taxableValue;
    acc[item.hsn].sgst += item.sgstAmount;
    acc[item.hsn].cgst += item.cgstAmount;
    acc[item.hsn].igst += item.igstAmount;
    return acc;
  }, {} as Record<string, any>);

  const hsnBody = Object.entries(hsnGroups).map(([hsn, data]) => [
    hsn,
    data.taxable.toFixed(2),
    (data.rate / 2).toFixed(2) + '%',
    data.sgst.toFixed(2),
    (data.rate / 2).toFixed(2) + '%',
    data.cgst.toFixed(2),
    '0.00%',
    '0.00'
  ]);

  autoTable(doc, {
    startY: finalY,
    head: [['HSN/SAC', 'Taxable', 'SGST %', 'Amt.', 'CGST %', 'Amt.', 'A.Tax %', 'Amt.']],
    body: hsnBody,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 0.5 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    margin: { left: margin },
    tableWidth: 120
  });

  // --- Summary Calculations (Right) ---
  const summaryX = pageWidth - margin - 60;
  doc.setFontSize(8);
  doc.text(`Total Amount Before Tax`, summaryX, finalY + 5);
  doc.text(invoice.totalTaxable.toFixed(2), pageWidth - margin - 2, finalY + 5, { align: 'right' });

  doc.text(`Add: SGST`, summaryX, finalY + 10);
  doc.text(invoice.totalSGST.toFixed(2), pageWidth - margin - 2, finalY + 10, { align: 'right' });

  doc.text(`Add: CGST`, summaryX, finalY + 15);
  doc.text(invoice.totalCGST.toFixed(2), pageWidth - margin - 2, finalY + 15, { align: 'right' });

  doc.text(`Add: IGST`, summaryX, finalY + 20);
  doc.text(invoice.totalIGST.toFixed(2), pageWidth - margin - 2, finalY + 20, { align: 'right' });

  doc.text(`Add: Additional Tax`, summaryX, finalY + 25);
  doc.text(`0.00`, pageWidth - margin - 2, finalY + 25, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Tax Amount : GST`, summaryX, finalY + 30);
  doc.text((invoice.totalSGST + invoice.totalCGST + invoice.totalIGST).toFixed(2), pageWidth - margin - 2, finalY + 30, { align: 'right' });

  doc.setLineWidth(0.5);
  doc.line(summaryX - 2, finalY + 33, pageWidth - margin, finalY + 33);
  doc.text(`Total Amount After Tax`, summaryX, finalY + 37);
  doc.text(invoice.grandTotal.toFixed(2), pageWidth - margin - 2, finalY + 37, { align: 'right' });

  // GRAND TOTAL BOX
  doc.rect(summaryX - 5, finalY + 42, pageWidth - margin - (summaryX - 5), 10);
  doc.setFontSize(11);
  doc.text('GRAND TOTAL', summaryX, finalY + 49);
  doc.setFontSize(14);
  doc.text(Math.round(invoice.grandTotal).toFixed(2), pageWidth - margin - 5, finalY + 49, { align: 'right' });

  // --- Bottom Words & Terms ---
  const bottomY = finalY + 55;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Input Tax Credit is Not Available to a taxable person against this copy`, margin + 2, bottomY);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Bill Amount In Words : ${numberToWords(Math.round(invoice.grandTotal))}`, margin + 2, bottomY + 5);
  doc.text(`Total GST Amount In Words : ${numberToWords(invoice.totalSGST + invoice.totalCGST + invoice.totalIGST)}`, margin + 2, bottomY + 10);

  doc.setFont('helvetica', 'normal');
  doc.text('Terms & Conditions:', margin + 2, bottomY + 18);
  doc.setFontSize(7);
  doc.text(profile.terms.split('\n'), margin + 2, bottomY + 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${profile.companyName}`, pageWidth - margin - 2, bottomY + 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Auth. Signatory', pageWidth - margin - 5, bottomY + 35, { align: 'right' });

  doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
};
