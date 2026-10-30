import React, { useState } from 'react';

// Live sample basket for the interactive receipt comparison
const RECEIPT_ITEMS = [
  { name: 'Clover Fresh Full Cream Milk 2L', checkers: 29.91, woolies: 42.94 },
  { name: 'Sasko Premium White Bread 700g', checkers: 18.14, woolies: 21.32 },
  { name: 'Nulaid Large Eggs 18pk', checkers: 52.99, woolies: 68.87 },
  { name: 'Tastic Long Grain Rice 2kg', checkers: 45.31, woolies: 52.45 },
  { name: 'Sunfoil Sunflower Cooking Oil 2L', checkers: 72.77, woolies: 87.68 },
];

export function SignUpCarousel() {
  const checkersTotal = RECEIPT_ITEMS.reduce((sum, item) => sum + item.checkers, 0);
  const wooliesTotal = RECEIPT_ITEMS.reduce((sum, item) => sum + item.woolies, 0);
  const difference = wooliesTotal - checkersTotal;

  return (
    <div className="relative h-full w-full bg-[#121212] p-8 sm:p-12 flex flex-col justify-between overflow-y-auto text-white">
      {/* Top Brand Banner */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-black font-mono lowercase tracking-tight">
            chuse<span className="text-[#FFE600]">.</span>
          </span>
          <span className="bg-[#FFE600] text-black font-extrabold text-[9px] px-2 py-0.5 rounded-[2px] font-mono uppercase tracking-wider">
            Live Retail Audit
          </span>
        </div>
        <p className="text-xs text-slate-400 font-sans max-w-sm">
          South African supermarket comparison engine. We track shelf prices so you know which store has the lowest basket total before you leave home.
        </p>
      </div>

      {/* Tactile Till Slip Comparison */}
      <div className="my-6 space-y-4">
        <div className="bg-[#FAF9F5] text-slate-900 rounded-[4px] p-5 shadow-2xl border border-slate-300 font-mono relative overflow-hidden">
          {/* Receipt Top Header */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
            <span className="text-[10px] tracking-widest uppercase font-bold text-slate-500 block">
              TAX INVOICE COMPARISON
            </span>
            <h4 className="text-sm font-black tracking-tight uppercase">
              Checkers vs. Woolworths Food
            </h4>
            <span className="text-[9.5px] text-slate-400">
              Johannesburg Central • 5 Basic Staples
            </span>
          </div>

          {/* Receipt Line Items */}
          <div className="space-y-1.5 text-xs border-b border-dashed border-slate-400 pb-3 mb-3">
            {RECEIPT_ITEMS.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="truncate flex-1 text-[11px] text-slate-700">
                  {item.name}
                </span>
                <span className="font-bold text-[#008374] text-[11px]">
                  R{item.checkers.toFixed(2)}
                </span>
                <span className="text-slate-400 line-through text-[10.5px]">
                  R{item.woolies.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Receipt Totals Summary */}
          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Woolworths Basket:</span>
              <span>R{wooliesTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-[#008374] text-sm">
              <span>Checkers Basket:</span>
              <span>R{checkersTotal.toFixed(2)}</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-900 flex justify-between font-black text-black text-xs bg-[#FFE600] px-2 py-1.5 rounded-[2px]">
              <span>MZANSI BASKET SAVINGS:</span>
              <span>R{difference.toFixed(2)}</span>
            </div>
          </div>

          {/* Zigzag Receipt Bottom Edge */}
          <div className="mt-3 text-center text-[9px] text-slate-400 font-mono tracking-widest uppercase">
            *** VERIFIED SUPERMARKET SHELF PRICING ***
          </div>
        </div>
      </div>

      {/* Footer Dispatch */}
      <div className="text-[10.5px] text-slate-400 font-mono border-t border-slate-800 pt-3">
        <span>Includes Checkers, Pick n Pay, Woolies, Shoprite, SPAR, Boxer & Food Lover's.</span>
      </div>
    </div>
  );
}
