// scripts/receipt_cli.js
// Standalone script to test receipt generation, WhatsApp message formatting, and PDF export

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample supermarket basket
const SAMPLE_BASKET = [
  {
    name: 'Clover Fresh Full Cream Milk 2L',
    unit: '2L',
    quantity: 2,
    store: 'Checkers',
    price: 29.91,
    highestPrice: 42.94
  },
  {
    name: 'Sasko Premium White Bread 700g',
    unit: '700g',
    quantity: 2,
    store: 'Shoprite',
    price: 17.11,
    highestPrice: 21.32
  },
  {
    name: 'Nulaid Large Grade A Eggs 18pk',
    unit: '18pk',
    quantity: 1,
    store: 'Boxer',
    price: 52.00,
    highestPrice: 68.87
  },
  {
    name: 'Tastic Parboiled Long Grain Rice 2kg',
    unit: '2kg',
    quantity: 1,
    store: 'SPAR',
    price: 39.54,
    highestPrice: 52.45
  },
  {
    name: 'Sunfoil Pure Sunflower Cooking Oil 2L',
    unit: '2L',
    quantity: 1,
    store: 'Shoprite',
    price: 67.69,
    highestPrice: 87.68
  }
];

function generateCliReceipt(items, province = 'Gauteng') {
  const timestamp = new Date();
  const invoiceNumber = `ZA-${Math.floor(1000 + Math.random() * 9000)}-${timestamp.toISOString().slice(5, 10).replace('-', '')}`;
  
  let optimizedTotal = 0;
  let baselineTotal = 0;
  let totalItemsCount = 0;

  // Group by store
  const storeMap = {};
  items.forEach(it => {
    const lineTotal = it.price * it.quantity;
    const lineBaseline = it.highestPrice * it.quantity;
    optimizedTotal += lineTotal;
    baselineTotal += lineBaseline;
    totalItemsCount += it.quantity;

    if (!storeMap[it.store]) {
      storeMap[it.store] = { items: [], subtotal: 0 };
    }
    storeMap[it.store].items.push({ ...it, lineTotal });
    storeMap[it.store].subtotal += lineTotal;
  });

  const savings = Math.max(0, baselineTotal - optimizedTotal);
  const savingsPct = baselineTotal > 0 ? Math.round((savings / baselineTotal) * 100) : 0;

  return {
    invoiceNumber,
    date: timestamp.toLocaleString('en-ZA'),
    province,
    items,
    storeMap,
    totalItemsCount,
    optimizedTotal,
    baselineTotal,
    savings,
    savingsPct
  };
}

function printAsciiReceipt(receipt) {
  console.log('\n========================================');
  console.log('                 chuse.                 ');
  console.log('       SOUTH AFRICA GROCERY AUDIT       ');
  console.log('         TAX INVOICE COMPARISON         ');
  console.log('========================================');
  console.log(`INVOICE: ${receipt.invoiceNumber}`);
  console.log(`DATE:    ${receipt.date}`);
  console.log(`REGION:  ${receipt.province.toUpperCase()}`);
  console.log('----------------------------------------');
  console.log('QTY  ITEM                             PRICE');
  console.log('----------------------------------------');

  Object.entries(receipt.storeMap).forEach(([store, data]) => {
    console.log(`[STORE: ${store.toUpperCase()}]`);
    data.items.forEach(it => {
      const name = it.name.length > 25 ? it.name.slice(0, 24) + '.' : it.name.padEnd(25);
      console.log(` ${it.quantity}x  ${name} R${it.lineTotal.toFixed(2).padStart(7)}`);
    });
    console.log(`     SUBTOTAL:                   R${data.subtotal.toFixed(2).padStart(7)}`);
    console.log('........................................');
  });

  console.log('========================================');
  console.log(`TOTAL ITEMS:                         ${receipt.totalItemsCount}`);
  console.log(`SINGLE STORE BASELINE:        R${receipt.baselineTotal.toFixed(2).padStart(8)}`);
  console.log(`OPTIMIZED SPLIT TOTAL:        R${receipt.optimizedTotal.toFixed(2).padStart(8)}`);
  console.log('----------------------------------------');
  console.log(`*** YOU SAVED: R${receipt.savings.toFixed(2)} (${receipt.savingsPct}%) ***`);
  console.log('========================================');
  console.log('      THANK YOU FOR SAVING WITH CHUSE   ');
  console.log('    AUDIT LIVE AT CHUSE-CHI.VERCEL.APP  ');
  console.log('||| | |||| || | |||| ||| |||| | ||| || |');
  console.log('========================================\n');
}

function exportPdfReceipt(receipt, outputPath) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200]
  });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);

  let y = 10;
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.text('chuse.', 40, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.text('TAX INVOICE & GROCERY AUDIT', 40, y, { align: 'center' });
  y += 4;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text(`INVOICE: ${receipt.invoiceNumber}`, 6, y);
  y += 3.5;
  doc.text(`DATE:    ${receipt.date}`, 6, y);
  y += 3.5;
  doc.text(`REGION:  ${receipt.province}`, 6, y);
  y += 5;

  doc.text('-'.repeat(38), 40, y, { align: 'center' });
  y += 4;

  Object.entries(receipt.storeMap).forEach(([store, data]) => {
    doc.setFont('courier', 'bold');
    doc.text(`[${store.toUpperCase()}]`, 6, y);
    y += 3.5;
    doc.setFont('courier', 'normal');

    data.items.forEach(it => {
      const shortName = it.name.length > 20 ? it.name.slice(0, 19) + '..' : it.name;
      doc.text(`${it.quantity}x ${shortName}`, 6, y);
      doc.text(`R${it.lineTotal.toFixed(2)}`, 74, y, { align: 'right' });
      y += 3.5;
    });

    doc.setFont('courier', 'bold');
    doc.text(`Subtotal:`, 6, y);
    doc.text(`R${data.subtotal.toFixed(2)}`, 74, y, { align: 'right' });
    y += 5;
  });

  doc.text('='.repeat(38), 40, y, { align: 'center' });
  y += 4.5;
  doc.setFontSize(9);
  doc.text(`OPTIMIZED TOTAL:`, 6, y);
  doc.text(`R${receipt.optimizedTotal.toFixed(2)}`, 74, y, { align: 'right' });
  y += 4.5;
  doc.setFontSize(8);
  doc.text(`*** SAVED: R${receipt.savings.toFixed(2)} (${receipt.savingsPct}%) ***`, 40, y, { align: 'center' });
  y += 6;

  doc.text('||| | |||| || | |||| ||| |||| | ||| ||', 40, y, { align: 'center' });

  const buffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ PDF till slip generated successfully at: ${outputPath}`);
}

const receipt = generateCliReceipt(SAMPLE_BASKET);
printAsciiReceipt(receipt);

const outputPdf = path.join(__dirname, '../sample_receipt.pdf');
exportPdfReceipt(receipt, outputPdf);
