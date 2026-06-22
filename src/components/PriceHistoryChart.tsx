import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, Sparkles } from 'lucide-react';
import { Product, StoreId } from '../types';
import { STORES } from '../data/catalog';

// Map store properties for convenience
const STORES_MAP: { [key in StoreId]?: { name: string; color: string } } = {
  woolworths: { name: 'Woolworths', color: '#111111' },
  checkers: { name: 'Checkers', color: '#0f766e' },
  pnp: { name: 'Pick n Pay', color: '#2563eb' },
  shoprite: { name: 'Shoprite', color: '#dc2626' },
  foodlovers: { name: 'Food Lover\'s Market', color: '#65a30d' },
  boxer: { name: 'Boxer Superstores', color: '#b91c1c' }
};

interface PriceHistoryChartProps {
  product: Product;
}

// Deterministic seed-based random number generator to ensure data remains stable
function getSeededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

export function generatePriceHistory(product: Product) {
  const intervals = [30, 24, 18, 12, 6, 0]; // 30 days history across 6 intervals
  const dataPoints: any[] = [];
  const rand = getSeededRandom(product.id);
  
  // Track random walk factors for each active store
  const storeFactors: { [storeId: string]: number[] } = {};
  
  product.prices.forEach(pr => {
    if (pr.inStock && pr.price > 0) {
      const factors: number[] = [];
      // Set a starting multiplier between 0.93 and 1.07
      let currentIdxVal = 0.95 + (rand() * 0.1); 
      
      for (let i = 0; i < intervals.length; i++) {
        if (i === intervals.length - 1) {
          // Today's factor must be exactly 1.0
          factors.push(1.0);
        } else {
          factors.push(currentIdxVal);
          // Gently drift the next value
          currentIdxVal = currentIdxVal + (rand() * 0.04 - 0.02);
        }
      }
      storeFactors[pr.storeId] = factors;
    }
  });

  // Base reference date matching context
  const today = new Date("2026-06-22T12:02:17-07:00");
  
  intervals.forEach((daysAgo, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    
    const point: any = { date: `${day} ${month}` };
    
    product.prices.forEach(pr => {
      if (pr.inStock && pr.price > 0) {
        const factors = storeFactors[pr.storeId];
        const factor = factors[idx];
        point[pr.storeId] = Number((pr.price * factor).toFixed(2));
      }
    });
    
    dataPoints.push(point);
  });
  
  return dataPoints;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 text-white p-2.5 rounded-xl shadow-xl text-[10px] font-sans">
        <p className="font-extrabold text-slate-400 mb-1.5 border-b border-slate-800 pb-1 uppercase tracking-wider">{label}</p>
        <div className="space-y-1.5">
          {payload.map((p: any) => {
            const storeId = p.dataKey as StoreId;
            const storeName = STORES_MAP[storeId]?.name || storeId;
            return (
              <div key={storeId} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-bold">
                  <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: p.stroke }} 
                  />
                  {storeName}
                </span>
                <span className="font-mono font-black text-[#FFE600]">
                  R {p.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ product }) => {
  const [showChart, setShowChart] = useState(false);
  
  // Collect all stores that have stocked pricing
  const activePriceStores = product.prices.filter(pr => pr.inStock && pr.price > 0);
  
  if (activePriceStores.length === 0) {
    return null;
  }
  
  const data = generatePriceHistory(product);

  // Derive mini summary metrics
  const storeDiffs = activePriceStores.map(pr => {
    const storeFactors = generatePriceHistory(product);
    const startPrice = storeFactors[0][pr.storeId];
    const endPrice = storeFactors[storeFactors.length - 1][pr.storeId];
    const percentageChange = ((endPrice - startPrice) / startPrice) * 100;
    return {
      storeId: pr.storeId,
      change: percentageChange,
      isUp: percentageChange > 0
    };
  });

  // Pick primary store change for a little helpful text helper
  const primaryChange = storeDiffs[0];
  const primaryStoreName = STORES_MAP[primaryChange?.storeId]?.name || 'Retail';

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setShowChart(!showChart)}
        className="w-full flex items-center justify-between py-2 px-3 text-xs font-bold text-slate-500 hover:text-slate-850 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer border border-slate-200/40 select-none active:scale-[0.99]"
      >
        <span className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px]">
          <TrendingUp className="w-3.5 h-3.5 text-amber-550 shrink-0" />
          Price History (30 Days)
        </span>
        <span className="flex items-center gap-2">
          {primaryChange && (
            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
              primaryChange.isUp ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'
            }`}>
              {primaryChange.isUp ? `+${primaryChange.change.toFixed(1)}%` : `${primaryChange.change.toFixed(1)}%`}
            </span>
          )}
          <span className="text-[10px] font-black text-slate-400">
            {showChart ? 'Hide' : 'Analyze'}
          </span>
        </span>
      </button>

      {showChart && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 relative overflow-hidden">
          {/* Ambient micro visual element */}
          <div className="absolute top-0 right-0 p-1">
            <Sparkles className="w-3 h-3 text-amber-400/30 animate-pulse" />
          </div>

          <div className="h-32 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 800 }} 
                  dy={6}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} 
                  domain={['dataMin - 1.5', 'dataMax + 1.5']}
                  tickFormatter={(val) => `R${val.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {activePriceStores.map(pr => {
                  const props = STORES_MAP[pr.storeId];
                  if (!props) return null;
                  return (
                    <Line
                      key={pr.storeId}
                      type="monotone"
                      dataKey={pr.storeId}
                      stroke={props.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: props.color }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center justify-start text-[9px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-200/50 pt-2.5">
            <span className="text-[10px] text-slate-500 font-extrabold mr-1">Indices:</span>
            {activePriceStores.map(pr => {
              const props = STORES_MAP[pr.storeId];
              if (!props) return null;
              return (
                <span key={pr.storeId} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: props.color }} />
                  <span className="text-slate-650 font-bold lowercase first-letter:uppercase">{props.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
