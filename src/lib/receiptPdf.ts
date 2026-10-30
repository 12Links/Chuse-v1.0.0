import { jsPDF } from 'jspdf';
import { ChuseReceipt } from '../types';

// Convert ChuseReceipt into an authentic 80mm thermal till slip PDF
export function generateReceiptPdf(receipt: ChuseReceipt): jsPDF {
  // Compute dynamic height based on store count and items count
  const baseHeightMm = 120;
  const itemHeightMm = receipt.items.length * 6.5;
  const storeGroupHeightMm = receipt.storeGroups.length * 14;
  const totalHeightMm = Math.max(160, baseHeightMm + itemHeightMm + storeGroupHeightMm);

  // 80mm thermal paper width
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeightMm]
  });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);

  let y = 10;
  const leftX = 6;
  const rightX = 74;
  const centerX = 40;

  // Dotted divider helper
  const drawDivider = (char: string = '-') => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    const line = char.repeat(38);
    doc.text(line, centerX, y, { align: 'center' });
    y += 4;
  };

  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.text('chuse.', centerX, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('courier', 'bold');
  doc.text('SOUTH AFRICA GROCERY AUDIT', centerX, y, { align: 'center' });
  y += 4;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text('TAX INVOICE & PRICE COMPARISON', centerX, y, { align: 'center' });
  y += 5;

  drawDivider('=');

  // Metadata
  const dateStr = new Date(receipt.createdAt).toLocaleString('en-ZA', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
  doc.setFontSize(7.5);
  doc.text(`INVOICE: ${receipt.invoiceNumber}`, leftX, y);
  y += 3.5;
  doc.text(`DATE:    ${dateStr}`, leftX, y);
  y += 3.5;
  doc.text(`REGION:  ${receipt.province.toUpperCase()}`, leftX, y);
  y += 4.5;

  drawDivider('-');

  // Table Column Headers
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.text('QTY  ITEM', leftX, y);
  doc.text('PRICE', rightX, y, { align: 'right' });
  y += 4;

  drawDivider('-');

  // Grouped by Retail Store
  receipt.storeGroups.forEach(group => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(`[STORE: ${group.storeName.toUpperCase()}]`, leftX, y);
    y += 4;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);

    group.items.forEach(item => {
      // Truncate name to fit 80mm column
      const truncatedName = item.productName.length > 22 
        ? item.productName.slice(0, 21) + '..' 
        : item.productName;

      doc.text(`${item.quantity}x  ${truncatedName}`, leftX, y);
      doc.text(`R${item.lineTotal.toFixed(2)}`, rightX, y, { align: 'right' });
      y += 3.8;
    });

    // Store subtotal
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(`  STORE SUBTOTAL:`, leftX, y);
    doc.text(`R${group.subtotal.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 5;
    drawDivider('.');
  });

  drawDivider('=');

  // Summary & Totals
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL ITEMS COUNT:', leftX, y);
  doc.text(`${receipt.totalItemCount}`, rightX, y, { align: 'right' });
  y += 4;

  doc.setFontSize(9);
  doc.text('OPTIMIZED BASKET:', leftX, y);
  doc.text(`R${receipt.optimizedTotal.toFixed(2)}`, rightX, y, { align: 'right' });
  y += 4.5;

  if (receipt.singleStoreBaselineTotal > receipt.optimizedTotal) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text('SINGLE STORE BASELINE:', leftX, y);
    doc.text(`R${receipt.singleStoreBaselineTotal.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 4.5;

    drawDivider('-');

    // Savings Highlight
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.text(`*** YOU SAVED R${receipt.totalSavings.toFixed(2)} (${receipt.savingsPercentage}%) ***`, centerX, y, { align: 'center' });
    y += 5;
  }

  drawDivider('=');

  // Footer & Barcode Art
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.text('THANK YOU FOR USING CHUSE', centerX, y, { align: 'center' });
  y += 3.5;
  doc.text('AUDIT SHELF PRICES AT CHUSE-CHI.VERCEL.APP', centerX, y, { align: 'center' });
  y += 5;

  // Pseudo Barcode representation
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text('||| | |||| || | |||| ||| |||| | ||| ||', centerX, y, { align: 'center' });
  y += 3.5;
  doc.setFontSize(6.5);
  doc.text(`* ${receipt.id} *`, centerX, y, { align: 'center' });

  return doc;
}

// Download PDF directly in the browser
export function downloadReceiptPdf(receipt: ChuseReceipt): void {
  const doc = generateReceiptPdf(receipt);
  const fileName = `Chuse_Receipt_${receipt.invoiceNumber}.pdf`;
  doc.save(fileName);
}
