import React, { useState } from 'react';
import { Product, Store, StoreId } from '../types';
import { STORES } from '../data/catalog';
import { FileText, Plus, Landmark, Check, AlertCircle, Coins } from 'lucide-react';
import { motion } from 'motion/react';

interface AddCustomProductProps {
  onAddProduct: (newProduct: Product) => void;
}

export default function AddCustomProduct({ onAddProduct }: AddCustomProductProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Groceries' | 'Household' | 'Pantry' | 'Fresh Produce' | 'Electronics'>('Groceries');
  const [unit, setUnit] = useState('');
  const [prices, setPrices] = useState<{ [key in StoreId]: string }>({
    woolworths: '',
    checkers: '',
    pnp: '',
    shoprite: '',
    foodlovers: '',
    boxer: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePriceChange = (storeId: StoreId, value: string) => {
    // allow only decimals and empty
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrices(prev => ({ ...prev, [storeId]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }

    if (!unit.trim()) {
      setError('Unit Sizing (e.g. 500g, 1kg, 2 Litre) is required.');
      return;
    }

    // Convert values into prices array
    const productPrices = STORES.map(store => {
      const inputVal = prices[store.id];
      const hasPrice = inputVal !== '' && parseFloat(inputVal) > 0;
      return {
        storeId: store.id,
        price: hasPrice ? parseFloat(inputVal) : 0,
        inStock: hasPrice
      };
    });

    const isAnyPriceLogged = productPrices.some(p => p.inStock);
    if (!isAnyPriceLogged) {
      setError('Please fill in at least one price for at least one store.');
      return;
    }

    const uniqueId = `custom-prod-${Date.now()}`;

    const newProduct: Product = {
      id: uniqueId,
      name: name.trim(),
      category,
      unit: unit.trim(),
      prices: productPrices,
      isPopular: false
    };

    onAddProduct(newProduct);

    // Reset Form
    setName('');
    setUnit('');
    setPrices({
      woolworths: '',
      checkers: '',
      pnp: '',
      shoprite: '',
      foodlovers: '',
      boxer: ''
    });
    setSuccess(true);

    // clear success badge after a brief moment
    setTimeout(() => {
      setSuccess(false);
    }, 4500);
  };

  return (
    <div id="add-custom-product-view" className="max-w-xl mx-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-150/60">
        <div className="bg-[#FFE600] text-black rounded-xl p-2.5 shadow-xs border border-yellow-300">
          <Coins className="w-5 h-5 text-black" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-850">Log Custom Store Prices</h2>
          <p className="text-xs text-slate-400 font-bold text-left">Help expand your map by logging custom local retail pricing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-semibold border border-rose-100/50">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            Product pricing logged successfully! Check the Catalog tab.
          </div>
        )}

        {/* Basic fields */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
              Product Name *
            </label>
            <input
              id="custom-name-input"
              type="text"
              placeholder="e.g. Black Cat Crunchy Peanut Butter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-55/40 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] transition-all font-bold text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                Category
              </label>
              <select
                id="custom-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-55/40 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-bold text-slate-800 cursor-pointer"
              >
                <option value="Groceries">Groceries</option>
                <option value="Pantry">Pantry</option>
                <option value="Fresh Produce">Fresh Produce</option>
                <option value="Household">Household</option>
                <option value="Electronics">Electronics</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                Unit Size *
              </label>
              <input
                id="custom-unit-input"
                type="text"
                placeholder="e.g. 400g Jar, Pack of 6"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-55/40 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] transition-all font-bold text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Store Prices fields */}
        <div className="space-y-3 pt-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Enter Store Prices in Rands (R)
          </label>
          <div className="grid grid-cols-2 gap-4">
            {STORES.map(store => (
              <div key={store.id} className="p-3.5 rounded-2xl bg-slate-55/70 border border-slate-150/40 space-y-2">
                {store.logoUrl ? (
                  <div className="inline-flex items-center gap-1.5 bg-white border border-neutral-200/50 rounded-full py-0.5 px-2 shadow-2xs">
                    <img 
                      src={store.logoUrl} 
                      alt={store.name} 
                      referrerPolicy="no-referrer"
                      className="h-4 w-auto object-contain shrink-0 max-w-[45px] mix-blend-multiply"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[9px] text-neutral-700 font-extrabold uppercase tracking-wider">
                      {store.name}
                    </span>
                  </div>
                ) : (
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    store.id === 'checkers' ? 'bg-[#006A4E] text-white' :
                    store.id === 'woolworths' ? 'bg-black text-white' :
                    store.id === 'pnp' ? 'bg-[#E11B22] text-white' :
                    store.logoColor
                  }`}>
                    {store.name}
                  </span>
                )}
                
                <div className="relative mt-1.5 align-middle">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black font-mono text-slate-400 leading-none">R</span>
                  <input
                    id={`price-input-${store.id}`}
                    type="text"
                    placeholder="0.00"
                    value={prices[store.id]}
                    onChange={(e) => handlePriceChange(store.id, e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          id="custom-product-submit"
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 py-4 rounded-full text-sm font-black text-black bg-[#FFE600] hover:bg-yellow-400 active:scale-[0.98] transition-all cursor-pointer shadow-sm mt-4"
        >
          <Plus className="w-4.5 h-4.5" /> Save Local Product Price Card
        </button>

      </form>
    </div>
  );
}
