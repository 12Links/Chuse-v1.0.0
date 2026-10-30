import React from 'react';
import { Product, StapleTimingAnalysis } from '../types';
import { 
  Bookmark, 
  BookmarkCheck, 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface StapleTimingSectionProps {
  product: Product;
  analysis: StapleTimingAnalysis;
  isTracked: boolean;
  onToggleTrack: (productId: string) => void;
}

export const StapleTimingSection: React.FC<StapleTimingSectionProps> = ({
  product,
  analysis,
  isTracked,
  onToggleTrack
}) => {
  const {
    status,
    badgeLabel,
    headline,
    explanation,
    currentBestPrice,
    bestStoreName,
    thirtyDayMin,
    thirtyDayAvg,
    thirtyDayMax,
    diffFromAvgPercent,
    recommendedAction,
    flyerCycleNote,
    isStaple
  } = analysis;

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E0D8] rounded-[6px] p-4 space-y-3.5 shadow-2xs font-sans">
      {/* Header & Status Pill */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E2E0D8] pb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
              {isStaple ? 'Essential Staple Predictor' : 'Price Cycle Predictor'}
            </span>
          </div>
          <h4 className="text-sm font-black text-slate-950 font-sans tracking-tight">
            {headline}
          </h4>
        </div>

        {/* Status Pill */}
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase px-2.5 py-1 rounded-[3px] border ${
            status === 'buy'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : status === 'fair'
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-rose-50 text-rose-700 border-rose-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'buy' ? 'bg-emerald-600 animate-pulse' : status === 'fair' ? 'bg-amber-500' : 'bg-rose-500'
            }`}
          />
          {badgeLabel}
        </span>
      </div>

      {/* 3-Segment Tactile Timing Gauge */}
      <div>
        <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold text-slate-400 mb-1">
          <span>Timing Gauge</span>
          <span>
            {status === 'buy' ? '🟢 Stock Up Zone' : status === 'fair' ? '🟡 Normal Range' : '🔴 Elevated Peak'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {/* Wait Segment */}
          <div
            className={`py-1.5 px-2 rounded-[3px] text-center border transition-all ${
              status === 'wait'
                ? 'bg-rose-100 border-rose-400 text-rose-900 font-black ring-1 ring-rose-400'
                : 'bg-slate-50 border-slate-200 text-slate-400 font-bold opacity-60'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider block">1. Wait</span>
            <span className="text-[8.5px] font-mono hidden sm:inline">Price Peak</span>
          </div>

          {/* Fair Segment */}
          <div
            className={`py-1.5 px-2 rounded-[3px] text-center border transition-all ${
              status === 'fair'
                ? 'bg-amber-100 border-amber-400 text-amber-900 font-black ring-1 ring-amber-400'
                : 'bg-slate-50 border-slate-200 text-slate-400 font-bold opacity-60'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider block">2. Fair</span>
            <span className="text-[8.5px] font-mono hidden sm:inline">Normal Shelf</span>
          </div>

          {/* Buy Now Segment */}
          <div
            className={`py-1.5 px-2 rounded-[3px] text-center border transition-all ${
              status === 'buy'
                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black ring-1 ring-emerald-400'
                : 'bg-slate-50 border-slate-200 text-slate-400 font-bold opacity-60'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider block">3. Buy Now</span>
            <span className="text-[8.5px] font-mono hidden sm:inline">30d Low / Sale</span>
          </div>
        </div>
      </div>

      {/* 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
        <div className="p-2.5 rounded-[3px] bg-[#F7F6F0] border border-[#E2E0D8]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
            Today's Best
          </span>
          <span className="text-sm font-black text-slate-950 block">
            R{currentBestPrice.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-500 truncate block">
            {bestStoreName}
          </span>
        </div>

        <div className="p-2.5 rounded-[3px] bg-[#F7F6F0] border border-[#E2E0D8]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
            30-Day Low
          </span>
          <span className="text-sm font-black text-emerald-700 block">
            R{thirtyDayMin.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-500 block">
            Lowest seen
          </span>
        </div>

        <div className="p-2.5 rounded-[3px] bg-[#F7F6F0] border border-[#E2E0D8]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
            30-Day Avg
          </span>
          <span className="text-sm font-black text-slate-700 block">
            R{thirtyDayAvg.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-500 block">
            {diffFromAvgPercent < 0 ? `${diffFromAvgPercent}% below` : `+${diffFromAvgPercent}% above`}
          </span>
        </div>

        <div className="p-2.5 rounded-[3px] bg-[#F7F6F0] border border-[#E2E0D8]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
            30-Day Peak
          </span>
          <span className="text-sm font-black text-slate-800 block">
            R{thirtyDayMax.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-500 block">
            Worst price
          </span>
        </div>
      </div>

      {/* Explanation & Retail Advice */}
      <div className="p-3 bg-[#F7F6F0] rounded-[4px] border border-[#E2E0D8] space-y-1.5 text-xs text-slate-700">
        <p className="font-medium leading-relaxed">
          {explanation}
        </p>
        <p className="text-[11px] font-bold text-slate-900">
          💡 Advice: {recommendedAction}
        </p>
      </div>

      {/* South African Supermarket Flyer Cycle Note */}
      <div className="flex items-start gap-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-[4px] text-xs text-amber-900">
        <Calendar className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-snug">
          <span className="font-black uppercase tracking-wider text-[10px] block font-mono text-amber-800">
            SA Supermarket Promo Cycle
          </span>
          <span>{flyerCycleNote}</span>
        </div>
      </div>

      {/* Watchlist / Tracked Staple Button */}
      <div className="pt-1">
        <button
          onClick={() => onToggleTrack(product.id)}
          className={`w-full py-2 px-3 rounded-[4px] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            isTracked
              ? 'bg-slate-950 text-[#FFE600] border-black hover:bg-slate-900'
              : 'bg-[#F7F6F0] text-slate-700 border-[#E2E0D8] hover:bg-slate-200'
          }`}
        >
          {isTracked ? (
            <>
              <BookmarkCheck className="w-4 h-4 text-[#FFE600]" />
              <span>Tracking This Staple (Saved in Local Storage)</span>
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4 text-slate-500" />
              <span>Track Staple for Weekly Price Drops</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
