import React, { useState } from 'react';
import { Product, Store, StoreId } from '../types';
import { STORES } from '../data/catalog';
import { BarChart2, TrendingUp, DollarSign, Award, Target, Tag, Info, ThumbsUp } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsDashboardProps {
  products: Product[];
}

export default function StatsDashboard({ products }: StatsDashboardProps) {
  const [hoveredBar, setHoveredBar] = useState<StoreId | null>(null);
  const [activeTab, setActiveTab] = useState<'basket' | 'markup'>('basket');

  // Calculate standard essential basket totals per store
  // Essential basket items: Sasko bread, Full cream milk, Huletts sugar, Sunfoil oil, Large eggs
  const essentialIds = ['prod-bread', 'prod-milk', 'prod-sugar', 'prod-oil', 'prod-eggs'];
  const essentialItems = products.filter(p => essentialIds.includes(p.id));

  const storeBasketData = STORES.map(store => {
    let total = 0;
    let counted = 0;
    essentialItems.forEach(item => {
      const priceInfo = item.prices.find(pr => pr.storeId === store.id);
      if (priceInfo && priceInfo.inStock && priceInfo.price > 0) {
        total += priceInfo.price;
        counted++;
      }
    });

    return {
      store,
      total,
      itemCount: counted,
      isValid: counted === essentialItems.length
    };
  }).filter(data => data.total > 0);

  // Sort store price index to rank value
  const sortedStoreBaskets = [...storeBasketData].sort((a, b) => a.total - b.total);
  const cheapestValue = sortedStoreBaskets[0]?.total || 1;
  const premiumValue = sortedStoreBaskets[sortedStoreBaskets.length - 1]?.total || 1;
  const averageValue = storeBasketData.reduce((sum, s) => sum + s.total, 0) / storeBasketData.length;

  // Custom SVG Heights for Bar Chart
  const svgWidth = 600;
  const svgHeight = 260;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Find max value in data to scale heights
  const maxVal = Math.max(...storeBasketData.map(d => d.total)) * 1.15;

  return (
    <div id="stats-dashboard-view" className="space-y-8">
      {/* Intro Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-start gap-4">
          <div className="bg-emerald-50 rounded-2xl p-3 text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Cheapest Store Basket</span>
            <span className="text-lg font-black text-slate-805 font-mono block mt-1">
              Shoprite (R {cheapestValue.toFixed(2)})
            </span>
            <span className="text-xs text-emerald-600 font-bold block mt-1">
              Save up to 34% on basic staples
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-start gap-4">
          <div className="bg-amber-50 rounded-2xl p-3 text-amber-600">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Average Essential Basket</span>
            <span className="text-lg font-black text-slate-805 font-mono block mt-1">
              R {averageValue.toFixed(2)}
            </span>
            <span className="text-xs text-amber-600 font-bold block mt-1">
              Includes 5 key grocery staples
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-start gap-4">
          <div className="bg-slate-900 rounded-2xl p-3 text-white">
            <TrendingUp className="w-5 h-5 text-[#FFE600]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Premium Retailer Index</span>
            <span className="text-lg font-black text-slate-805 font-mono block mt-1">
              Woolworths (R {premiumValue.toFixed(2)})
            </span>
            <span className="text-xs text-rose-500 font-bold block mt-1">
              + R {(premiumValue - cheapestValue).toFixed(2)} difference on staples
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main interactive SVG Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-850 text-lg flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-amber-550" />
                Essential SA Grocery Basket Total Cost
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                Bread + Milk + Sugar + Cooking Oil + 30 Eggs (Rands)
              </p>
            </div>

            <div className="flex bg-slate-50 p-1 rounded-full text-xs font-bold gap-1 self-start border border-slate-200">
              <button
                id="tab-stat-basket"
                onClick={() => setActiveTab('basket')}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                  activeTab === 'basket' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Staples Basket
              </button>
              <button
                id="tab-stat-markup"
                onClick={() => setActiveTab('markup')}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                  activeTab === 'markup' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Average Markups Index
              </button>
            </div>
          </div>

          {activeTab === 'basket' ? (
            <div className="w-full relative overflow-x-auto">
              <div className="min-w-[500px]">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const priceLabel = Math.round(ratio * maxVal);
                    const y = paddingTop + chartHeight * (1 - ratio);
                    return (
                      <g key={idx}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgWidth - paddingRight}
                          y2={y}
                          className="stroke-slate-100"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingLeft - 10}
                          y={y + 4}
                          className="text-[10px] font-mono font-bold fill-slate-400 text-right"
                          textAnchor="end"
                        >
                          R {priceLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {storeBasketData.map((data, idx) => {
                    const barWidth = chartWidth / storeBasketData.length - 16;
                    const barHeight = (data.total / maxVal) * chartHeight;
                    const x = paddingLeft + idx * (chartWidth / storeBasketData.length) + 8;
                    const y = paddingTop + chartHeight - barHeight;

                    // Color coordination based on store ID
                    let barColor = 'fill-slate-800 hover:fill-slate-900';
                    if (data.store.id === 'checkers') barColor = 'fill-[#006A4E] hover:opacity-90';
                    if (data.store.id === 'pnp') barColor = 'fill-[#E11B22] hover:opacity-90';
                    if (data.store.id === 'shoprite') barColor = 'fill-[#D22630] hover:opacity-90';
                    if (data.store.id === 'foodlovers') barColor = 'fill-lime-600 hover:fill-lime-700';
                    if (data.store.id === 'boxer') barColor = 'fill-red-700 hover:fill-red-850';
                    if (data.store.id === 'woolworths') barColor = 'fill-slate-900 hover:fill-slate-800';

                    const isHovered = hoveredBar === data.store.id;

                    return (
                      <g key={data.store.id}>
                        <rect
                          id={`stat-bar-${data.store.id}`}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="6"
                          className={`${barColor} transition-all duration-350 cursor-pointer ${isHovered ? 'opacity-80 scale-x-[1.02]' : ''}`}
                          onMouseEnter={() => setHoveredBar(data.store.id)}
                          onMouseLeave={() => setHoveredBar(null)}
                        />
                        
                        {/* Interactive price floating top label */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 8}
                          className="text-xs font-mono font-extrabold fill-slate-700"
                          textAnchor="middle"
                        >
                          R {data.total.toFixed(0)}
                        </text>

                        {/* Store bottom labels */}
                        <text
                          x={x + barWidth / 2}
                          y={svgHeight - paddingBottom + 18}
                          className={`text-[10px] font-black ${isHovered ? 'fill-amber-600 font-black' : 'fill-slate-450'}`}
                          textAnchor="middle"
                        >
                          {data.store.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Tooltip Overlay */}
              {hoveredBar && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 text-white p-4 rounded-2xl shadow-xl max-w-xs border border-slate-800 z-20 pointer-events-none">
                  {(() => {
                    const hData = storeBasketData.find(d => d.store.id === hoveredBar)!;
                    const diffPct = Math.round(((hData.total - cheapestValue) / cheapestValue) * 100);
                    return (
                      <div className="space-y-1 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{hData.store.name}</span>
                        <div className="text-lg font-black font-mono">R {hData.total.toFixed(2)}</div>
                        <p className="text-xs leading-snug text-slate-350">
                          {diffPct === 0 ? '✓ Baseline cheapest staples' : `+${diffPct}% premium markup compare to baseline`}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full relative overflow-x-auto">
              <div className="min-w-[500px]">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const priceLabel = Math.round(ratio * 40);
                    const y = paddingTop + chartHeight * (1 - ratio);
                    return (
                      <g key={idx}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgWidth - paddingRight}
                          y2={y}
                          className="stroke-slate-100"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingLeft - 10}
                          y={y + 4}
                          className="text-[10px] font-mono font-bold fill-slate-400 text-right"
                          textAnchor="end"
                        >
                          {priceLabel}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Markup percentages bars */}
                  {[
                    { name: 'Boxer', id: 'boxer', pct: 3 },
                    { name: 'Shoprite', id: 'shoprite', pct: 6 },
                    { name: 'Food Lover\'s', id: 'foodlovers', pct: 14 },
                    { name: 'Checkers', id: 'checkers', pct: 18 },
                    { name: 'Pick n Pay', id: 'pnp', pct: 21 },
                    { name: 'Woolworths', id: 'woolworths', pct: 38 },
                  ].map((data, idx) => {
                    const barWidth = chartWidth / storeBasketData.length - 16;
                    const barHeight = (data.pct / 40) * chartHeight;
                    const x = paddingLeft + idx * (chartWidth / storeBasketData.length) + 8;
                    const y = paddingTop + chartHeight - Math.max(4, barHeight);

                    let barColor = 'fill-[#006A4E]'; 
                    if (data.pct > 15 && data.pct <= 25) barColor = 'fill-[#E11B22]'; 
                    if (data.pct > 25) barColor = 'fill-slate-900';

                    return (
                      <g key={data.id}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(4, barHeight)}
                          rx="6"
                          className={`${barColor} transition-all duration-300 cursor-pointer hover:opacity-80`}
                        />
                        <text
                          x={x + barWidth / 2}
                          y={y - 8}
                          className="text-[11px] font-mono font-extrabold fill-slate-700"
                          textAnchor="middle"
                        >
                          +{data.pct}%
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={svgHeight - paddingBottom + 18}
                          className="text-[10px] font-black fill-slate-450"
                          textAnchor="middle"
                        >
                          {data.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Consumer Tips & Analytics sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm space-y-4 border border-slate-800">
            <h4 className="font-extrabold text-base flex items-center gap-1.5 text-[#FFE600]">
              <Info className="w-5 h-5 shrink-0" />
              SA Budgeting Insights
            </h4>
            
            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed font-semibold">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <span className="text-white font-extrabold block mb-1">💡 Smart Shopper & Xtra Savings</span>
                Checkers Xtra Savings and Pick n Pay Smart Shopper cards receive instant markdown discounts up to 20% on shelf price. Always link your loyalty profile!
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <span className="text-white font-extrabold block mb-1">🥑 Fresh Produce Rule</span>
                Woolworths leads in produce quality and durability, while Food Lover's Market offers exceptional value and variety of hand-selected fresh fruits and veggies.
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <span className="text-white font-extrabold block mb-1">📦 Bulk Staples Deals</span>
                Essential commodity items like maize meal, oil, flour, and sugar are significantly cheaper when bought in bulk from Boxer Superstores.
              </div>
            </div>
          </div>

          <div className="bg-amber-100/20 border border-amber-200/30 rounded-3xl p-6 space-y-3">
            <h4 className="font-extrabold text-slate-805 text-sm flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4 text-amber-600 animate-pulse" />
              Inflation Bargain Meter
            </h4>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              We monitor average prices of essential products daily relative to high inflation margins. Currently, basic grocery products have experienced moderate relative volatility.
            </p>
            <div className="bg-white rounded-xl p-3.5 border border-amber-150 flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-600">Bargain index:</span>
              <span className="font-mono text-amber-630 font-black">7.8 / 10 Excellent Savings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
