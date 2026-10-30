import React, { useState } from 'react';
import { ChuseReceipt } from '../types';
import { shareReceiptViaWhatsApp, getWhatsAppReceiptText } from '../lib/receiptWhatsApp';
import { downloadReceiptPdf } from '../lib/receiptPdf';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  HardDrive 
} from 'lucide-react';

interface ReceiptModalProps {
  receipt: ChuseReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ receipt, isOpen, onClose }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen || !receipt) return null;

  const dateFormatted = new Date(receipt.createdAt).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const handleCopyText = () => {
    const text = getWhatsAppReceiptText(receipt);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    try {
      downloadReceiptPdf(receipt);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleWhatsApp = () => {
    shareReceiptViaWhatsApp(receipt);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-[8px] max-w-md w-full shadow-2xl border border-[#E2E0D8] relative my-6 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Action Bar */}
        <div className="p-3.5 px-4 border-b border-[#E2E0D8] bg-[#F7F6F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-900">
              Till Slip Receipt & WhatsApp Share
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[4px] bg-white border border-[#E2E0D8] flex items-center justify-center text-slate-500 hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100 flex flex-col items-center">
          
          {/* Authentic Paper Till Slip */}
          <div className="w-full max-w-sm bg-[#FAF9F5] text-slate-900 rounded-[2px] p-5 shadow-md border border-slate-300 font-mono text-xs relative">
            
            {/* Till Slip Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <span className="text-xl font-black font-display tracking-tight block">
                chuse<span className="text-[#FFE600]">.</span>
              </span>
              <span className="text-[9.5px] uppercase tracking-widest text-slate-500 font-bold block mt-0.5">
                Mzansi Supermarket Price Audit
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                Tax Invoice Comparison Slip
              </span>
            </div>

            {/* Receipt Metadata */}
            <div className="space-y-0.5 text-[10.5px] border-b border-dashed border-slate-400 pb-2.5 mb-3">
              <div className="flex justify-between text-slate-600">
                <span>INVOICE REF:</span>
                <span className="font-bold text-slate-900">{receipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>DATE:</span>
                <span>{dateFormatted}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>REGION:</span>
                <span className="font-bold">{receipt.province.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>STORAGE:</span>
                <span className="text-emerald-700 font-bold">Saved to Local Device</span>
              </div>
            </div>

            {/* Line Items Grouped by Store */}
            <div className="space-y-3 border-b border-dashed border-slate-400 pb-3 mb-3">
              {receipt.storeGroups.map(group => (
                <div key={group.storeId} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-800 bg-slate-200/70 px-1.5 py-0.5 rounded-[2px]">
                    <span>[STORE: {group.storeName}]</span>
                    <span>{group.items.length} items</span>
                  </div>

                  {group.items.map(it => (
                    <div key={it.productId} className="flex justify-between items-baseline text-[11px] pl-1">
                      <span className="truncate pr-2 text-slate-700">
                        {it.quantity}x {it.productName}
                      </span>
                      <span className="font-bold shrink-0">
                        R{it.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <div className="flex justify-between text-[10px] text-slate-600 font-bold pt-0.5 border-t border-dotted border-slate-300">
                    <span className="pl-1">Store Subtotal:</span>
                    <span>R{group.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Totals */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Total Items:</span>
                <span>{receipt.totalItemCount}</span>
              </div>

              {receipt.singleStoreBaselineTotal > receipt.optimizedTotal && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Single-Store Baseline:</span>
                  <span>R{receipt.singleStoreBaselineTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300 text-slate-950">
                <span>OPTIMIZED TOTAL:</span>
                <span>R{receipt.optimizedTotal.toFixed(2)}</span>
              </div>

              {receipt.totalSavings > 0 && (
                <div className="mt-2 pt-1.5 border-t border-slate-900 bg-[#FFE600] text-black p-2 rounded-[2px] font-black text-xs flex justify-between items-center">
                  <span>MZANSI BASKET SAVINGS:</span>
                  <span>R{receipt.totalSavings.toFixed(2)} ({receipt.savingsPercentage}%)</span>
                </div>
              )}
            </div>

            {/* Thermal Barcode Art at Bottom */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-400 text-center space-y-1">
              <div className="text-[10px] tracking-widest font-black">
                ||| | |||| || | |||| ||| |||| | ||| ||
              </div>
              <div className="text-[8.5px] text-slate-400 tracking-wider">
                * {receipt.id} *
              </div>
              <div className="text-[8.5px] text-slate-500 uppercase">
                Audited with chuse. • Prices updated daily
              </div>
            </div>

            {/* Zigzag Receipt Cut Graphic */}
            <div className="absolute -bottom-1.5 left-0 right-0 h-3 flex overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-4 h-4 bg-slate-100 rotate-45 transform origin-top -translate-y-2 shrink-0" 
                />
              ))}
            </div>
          </div>

          {/* Local Storage Indicator Banner */}
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Receipt automatically cached in local browser storage</span>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E2E0D8] bg-[#FFFFFF] space-y-2 shrink-0 font-sans">
          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp Share Button */}
            <button
              onClick={handleWhatsApp}
              className="py-2.5 px-3 rounded-[4px] bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share WhatsApp</span>
            </button>

            {/* PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="py-2.5 px-3 rounded-[4px] bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>

          <button
            onClick={handleCopyText}
            className="w-full py-2 rounded-[4px] border border-[#E2E0D8] bg-[#F7F6F0] hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied till slip to clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Text Breakdown</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
