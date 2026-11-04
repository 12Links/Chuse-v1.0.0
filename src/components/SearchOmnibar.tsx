import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Scan, 
  Mic, 
  MicOff, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Plus, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { Product } from '../types';
import { RETAILER_THEMES } from '../lib/retailerTokens';
import { motion, AnimatePresence } from 'motion/react';

interface SearchOmnibarProps {
  value: string;
  onChange: (val: string) => void;
  onSearchSubmit: (query: string) => void;
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onAddToBasket?: (productId: string) => void;
  onOpenBarcodeScanner?: () => void;
  placeholder?: string;
  isSearchingRealTime?: boolean;
}

const POPULAR_STAPLE_CHIPS = [
  { label: 'Milk 2L', query: 'milk 2l', emoji: '🥛' },
  { label: 'White Bread', query: 'white bread', emoji: '🍞' },
  { label: 'Cooking Oil', query: 'oil 2l', emoji: '🌻' },
  { label: 'Large Eggs 18s', query: 'eggs 18', emoji: '🥚' },
  { label: 'Spekko Rice 2kg', query: 'rice 2kg', emoji: '🍚' },
  { label: 'White Sugar 2.5kg', query: 'sugar', emoji: '🍬' },
  { label: 'Instant Coffee', query: 'coffee', emoji: '☕' },
];

export function SearchOmnibar({
  value,
  onChange,
  onSearchSubmit,
  products,
  onSelectProduct,
  onAddToBasket,
  onOpenBarcodeScanner,
  placeholder = "Search groceries across Checkers, Pick n Pay, Woolies...",
  isSearchingRealTime = false
}: SearchOmnibarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('chuse_recent_searches');
      return stored ? JSON.parse(stored) : ['Clover Milk 2L', 'Albany Superior Bread', 'Sunfoil Oil'];
    } catch {
      return ['Clover Milk 2L', 'Albany Superior Bread', 'Sunfoil Oil'];
    }
  });

  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('chuse_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent search to localStorage', e);
    }
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem('chuse_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update recent search in localStorage', e);
    }
  };

  const handleSelectQuery = (term: string) => {
    onChange(term);
    saveRecentSearch(term);
    onSearchSubmit(term);
    setIsOpen(false);
  };

  // Voice Search Handler
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please type your search or use modern Chrome/Edge/Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-ZA'; // South African English
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onChange(transcript);
          saveRecentSearch(transcript);
          onSearchSubmit(transcript);
        }
        setIsListening(false);
        setIsOpen(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn("Speech recognition error:", e);
      setIsListening(false);
    }
  };

  // Instant matching products (up to 4 items)
  const matchedProducts = React.useMemo(() => {
    if (!value.trim()) return [];
    const query = value.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter(Boolean);

    return products
      .filter(p => {
        const text = `${p.name} ${p.category} ${p.unit || ''}`.toLowerCase();
        return tokens.every(tok => text.includes(tok));
      })
      .slice(0, 4);
  }, [value, products]);

  return (
    <div ref={containerRef} className="relative w-full max-w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (value.trim()) {
                saveRecentSearch(value);
                onSearchSubmit(value.trim());
                setIsOpen(false);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-24 py-2 sm:py-2.5 rounded-lg bg-slate-100/90 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-950/10 transition-all font-sans"
        />

        {/* Action icons on right: Clear, Voice Mic, Barcode */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Voice Search Button */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
            title={isListening ? "Listening..." : "Search with voice (English ZA)"}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Barcode Scanner Button */}
          {onOpenBarcodeScanner && (
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Scan barcode with camera"
            >
              <Scan className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Predictive Typeahead Flyout Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden font-sans"
          >
            {/* Live Product Previews matching the input */}
            {value.trim() && matchedProducts.length > 0 && (
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between text-[10.5px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FFD200]" />
                    Instant Matches
                  </span>
                  <span>{matchedProducts.length} items</span>
                </div>

                <div className="space-y-1.5">
                  {matchedProducts.map((p) => {
                    const validPrices = p.prices.filter(pr => pr.inStock && pr.price > 0);
                    const minPrice = validPrices.length > 0 ? Math.min(...validPrices.map(pr => pr.price)) : 0;
                    const cheapestPriceObj = validPrices.find(pr => pr.price === minPrice);
                    const retailer = cheapestPriceObj ? RETAILER_THEMES[cheapestPriceObj.storeId] : null;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectProduct?.(p);
                          setIsOpen(false);
                        }}
                        className="p-2 rounded-lg bg-white border border-slate-200/80 hover:border-slate-400 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}
                            alt={p.name}
                            className="w-9 h-9 object-contain bg-slate-50 rounded p-1 border border-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-black">
                              {p.name}
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10.5px]">
                              <span className="font-mono font-black text-slate-950">
                                R{minPrice.toFixed(2)}
                              </span>
                              {retailer && (
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${retailer.badgeBg} ${retailer.badgeText}`}>
                                  {retailer.shortName}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {p.unit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {onAddToBasket && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToBasket(p.id);
                            }}
                            className="px-2.5 py-1 rounded bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-bold text-[11px] font-sans flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popular Staple Quick Chips */}
            <div className="p-3 border-b border-slate-100">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Popular Mzansi Staples
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_STAPLE_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleSelectQuery(chip.query)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{chip.emoji}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches List */}
            {recentSearches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('chuse_recent_searches');
                    }}
                    className="text-slate-400 hover:text-slate-800 font-mono text-[9.5px] cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => handleSelectQuery(term)}
                      className="py-1.5 px-1 flex items-center justify-between hover:bg-slate-50 rounded cursor-pointer group"
                    >
                      <span className="text-xs font-medium text-slate-700 group-hover:text-black">
                        {term}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(term, e)}
                        className="text-slate-300 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
