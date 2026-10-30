import { ChuseReceipt } from '../types';

// Format receipt data into an authentic, readable WhatsApp shopping dispatch
export function getWhatsAppReceiptText(receipt: ChuseReceipt): string {
  const dateFormatted = new Date(receipt.createdAt).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const storeSections = receipt.storeGroups
    .map(group => {
      const itemLines = group.items
        .map(it => `  • ${it.quantity}x ${it.productName} — R${it.lineTotal.toFixed(2)} (R${it.bestPrice.toFixed(2)} ea)`)
        .join('\n');

      return `🏪 *${group.storeName.toUpperCase()}* (${group.items.length} items)\n${itemLines}\n  _Subtotal: R${group.subtotal.toFixed(2)}_`;
    })
    .join('\n\n');

  return `🧾 *CHUSE. GROCERY AUDIT TILL SLIP*
📅 ${dateFormatted}
📍 Region: ${receipt.province}
📄 Tax Ref: ${receipt.invoiceNumber}

${storeSections}

─────────────────────────
💰 *OPTIMIZED SPLIT TOTAL: R${receipt.optimizedTotal.toFixed(2)}*
🛍️ Items: ${receipt.totalItemCount} products across ${receipt.storeGroups.length} stores
${receipt.totalSavings > 0 ? `🎉 *YOU SAVE: R${receipt.totalSavings.toFixed(2)} (${receipt.savingsPercentage}%)* vs single store` : ''}
─────────────────────────
📄 PDF receipt saved to local device storage.
🔗 Audit shelf prices live: https://chuse-chi.vercel.app/`;
}

// Generate the WhatsApp URL
export function generateWhatsAppReceiptUrl(receipt: ChuseReceipt): string {
  const text = getWhatsAppReceiptText(receipt);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Open WhatsApp share directly
export function shareReceiptViaWhatsApp(receipt: ChuseReceipt): void {
  const url = generateWhatsAppReceiptUrl(receipt);
  window.open(url, '_blank', 'noopener,noreferrer');
}
