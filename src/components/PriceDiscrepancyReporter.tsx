import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  DollarSign, 
  ShoppingBag, 
  Check, 
  Camera, 
  ThumbsUp, 
  HelpCircle 
} from 'lucide-react';
import { Product } from '../types';
import { STORES } from '../data/catalog';

interface DiscrepancyReport {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  province: string;
  catalogPrice: number;
  shelfPrice: number;
  reportedBy: string;
  date: string;
  status: 'pending' | 'verified' | 'rejected';
  votes: number;
  userVoted?: boolean;
}

interface PriceDiscrepancyReporterProps {
  products: Product[];
}

export default function PriceDiscrepancyReporter({ products }: PriceDiscrepancyReporterProps) {
  const [reports, setReports] = useState<DiscrepancyReport[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('checkers');
  const [shelfPrice, setShelfPrice] = useState('');
  const [province, setProvince] = useState('Gauteng');
  const [reporterName, setReporterName] = useState('Guest Explorer');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial dummy verified reports for cold start demo
  useEffect(() => {
    const saved = localStorage.getItem('sa_price_discrepancy_reports');
    if (saved) {
      try {
        setReports(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse discrepancy reports:', e);
      }
    } else {
      const initial: DiscrepancyReport[] = [
        {
          id: 'rep-1',
          productId: 'prod-coffee-jacobs',
          productName: 'Jacobs Kronung Instant Coffee 200g',
          storeId: 'checkers',
          storeName: 'Checkers',
          province: 'Gauteng',
          catalogPrice: 149.99,
          shelfPrice: 134.99,
          reportedBy: 'Kabelo_ZA',
          date: new Date(Date.now() - 3 * 3600000).toISOString(),
          status: 'verified',
          votes: 14
        },
        {
          id: 'rep-2',
          productId: 'prod-milk-clover',
          productName: 'Clover Full Cream Fresh Milk 2L',
          storeId: 'woolworths',
          storeName: 'Woolworths',
          province: 'Western Cape',
          catalogPrice: 42.50,
          shelfPrice: 45.99,
          reportedBy: 'Sanele_WW',
          date: new Date(Date.now() - 14 * 3600000).toISOString(),
          status: 'verified',
          votes: 8
        },
        {
          id: 'rep-3',
          productId: 'prod-bread-sasko',
          productName: 'Sasko Premium White Bread 700g',
          storeId: 'pnp',
          storeName: 'Pick n Pay',
          province: 'KwaZulu-Natal',
          catalogPrice: 18.50,
          shelfPrice: 18.20,
          reportedBy: 'DevonP',
          date: new Date(Date.now() - 25 * 3600000).toISOString(),
          status: 'pending',
          votes: 2
        }
      ];
      setReports(initial);
      localStorage.setItem('sa_price_discrepancy_reports', JSON.stringify(initial));
    }
  }, []);

  const saveReports = (updatedReports: DiscrepancyReport[]) => {
    setReports(updatedReports);
    localStorage.setItem('sa_price_discrepancy_reports', JSON.stringify(updatedReports));
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const currentCatalogPrice = selectedProduct?.prices.find(p => p.storeId === selectedStoreId)?.price || 0;

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProductId) {
      setErrorMsg('Please select a product first.');
      return;
    }

    if (!shelfPrice || isNaN(Number(shelfPrice)) || Number(shelfPrice) <= 0) {
      setErrorMsg('Please enter a valid spotted shelf price.');
      return;
    }

    const selectedStore = STORES.find(s => s.id === selectedStoreId);
    
    const newReport: DiscrepancyReport = {
      id: `rep-${Date.now()}`,
      productId: selectedProductId,
      productName: selectedProduct?.name || 'Custom Product',
      storeId: selectedStoreId,
      storeName: selectedStore?.name || selectedStoreId,
      province,
      catalogPrice: currentCatalogPrice,
      shelfPrice: Number(shelfPrice),
      reportedBy: reporterName.trim() || 'Anonymous Explorer',
      date: new Date().toISOString(),
      status: 'pending',
      votes: 1
    };

    const updated = [newReport, ...reports];
    saveReports(updated);

    // Reset Form
    setSelectedProductId('');
    setShelfPrice('');
    setUploadedFileName(null);
    setSuccessMsg('Price report submitted! The community will verify this report shortly.');
    
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleUpvote = (id: string) => {
    const updated = reports.map(r => {
      if (r.id === id) {
        if (r.userVoted) {
          return { ...r, votes: r.votes - 1, userVoted: false };
        } else {
          return { ...r, votes: r.votes + 1, userVoted: true };
        }
      }
      return r;
    });
    saveReports(updated);
  };

  const handleVerify = (id: string) => {
    const updated = reports.map(r => {
      if (r.id === id) {
        return { ...r, status: 'verified' as const };
      }
      return r;
    });
    saveReports(updated);
  };

  // Filtered products dropdown list
  const filteredSuggestions = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const timeSince = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' mins ago';
    return 'just now';
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">Live Price Verification Hub</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Found a mismatched price? Report it to help fellow South Africans beat the rising cost of living</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand: Log Discrepancy Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6.5 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-black text-slate-900 uppercase">File Shelf Price Report</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Product Selection lookup */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">1. Select catalog item</label>
                <input 
                  type="text"
                  placeholder="Type product name (e.g. Clover, Sasko, sugar)..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (selectedProductId) setSelectedProductId('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-semibold"
                />

                {/* Suggestions display */}
                {searchQuery !== '' && !selectedProductId && (
                  <div className="absolute z-20 left-0 right-0 top-16 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden p-1.5 space-y-1">
                    {filteredSuggestions.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setSearchQuery(p.name);
                        }}
                        className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2.5 text-left transition-colors"
                      >
                        <img src={p.imageUrl} alt={p.name} className="w-6.5 h-6.5 object-cover rounded bg-slate-50" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block leading-none">{p.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{p.unit} • {p.category}</span>
                        </div>
                      </div>
                    ))}
                    {filteredSuggestions.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400 font-bold">No products found matching "{searchQuery}"</div>
                    )}
                  </div>
                )}

                {selectedProduct && (
                  <div className="p-3 bg-[#FFE600]/10 rounded-xl border border-[#FFE600]/40 flex items-center gap-3">
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-9 h-9 object-cover rounded bg-white border border-[#FFE600]/20" />
                    <div className="text-left leading-none">
                      <span className="text-xs font-bold text-slate-800 block">{selectedProduct.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase tracking-wide">{selectedProduct.unit} Selected</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Store & Location */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">2. Supermarket</label>
                  <select 
                    value={selectedStoreId}
                    onChange={e => setSelectedStoreId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-bold text-slate-700 uppercase"
                  >
                    {STORES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">3. Province Location</label>
                  <select 
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-bold text-slate-700 uppercase"
                  >
                    <option value="Gauteng">Gauteng (GP)</option>
                    <option value="Western Cape">Western Cape (WC)</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal (KZN)</option>
                    <option value="Eastern Cape">Eastern Cape (EC)</option>
                    <option value="Free State">Free State (FS)</option>
                  </select>
                </div>
              </div>

              {/* Spotted Shelf Price vs Catalog price */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5 bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-left">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Catalog Price</span>
                  <span className="text-sm font-black text-slate-850 block mt-1">
                    {currentCatalogPrice ? `R ${currentCatalogPrice.toFixed(2)}` : 'R 0.00'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Shelf Price Spotted (ZAR)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 139.99"
                    value={shelfPrice}
                    onChange={e => setShelfPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-bold text-slate-800"
                    step="0.01"
                    min="1"
                    max="5000"
                    required
                  />
                </div>
              </div>

              {/* Reporter Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">4. Reporter Profile Handle</label>
                <input 
                  type="text"
                  placeholder="Your handle (e.g. Kabelo_Spotted)"
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-semibold"
                />
              </div>

              {/* Drag and Drop File Receipt Upload Container */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">5. Proof of Purchase / Shelf Photo (Optional)</label>
                <div 
                  id="drop-zone"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer relative ${
                    dragActive ? 'border-[#FFE600] bg-[#FFE600]/5' : 'border-slate-200 hover:border-slate-350 bg-slate-50/40'
                  }`}
                >
                  <input 
                    id="receipt-file-input"
                    type="file" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                  />
                  
                  <div className="space-y-1">
                    <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Drag & drop image or Click to upload proof'}
                    </p>
                    <span className="text-[8px] text-slate-400 font-medium block">PNG, JPG up to 5MB supported</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-slate-900 text-white hover:bg-[#FFE600] hover:text-black transition-all rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Submit Discrepancy Report
              </button>
            </form>
          </div>
        </div>

        {/* Right Hand: Recent Reports List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Verified Community Reports ({reports.length})</span>
              <span className="text-[9px] text-[#FFE600] bg-black px-2 py-0.5 rounded-full font-bold uppercase">South Africa Live Index</span>
            </div>

            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
              {reports.map(rep => {
                const isUnder = rep.shelfPrice < rep.catalogPrice;
                const priceDiffPercent = Math.abs((rep.shelfPrice - rep.catalogPrice) / rep.catalogPrice) * 100;
                
                return (
                  <div 
                    key={rep.id}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-100/50"
                  >
                    <div className="space-y-2.5 text-left flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          {rep.storeName}
                        </span>
                        <span className="bg-amber-500/10 text-amber-600 border border-amber-200/50 text-[8px] font-black uppercase px-2 py-0.5 rounded">
                          {rep.province}
                        </span>
                        
                        {rep.status === 'verified' ? (
                          <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified Spot
                          </span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-600 border border-yellow-200/50 text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Pending Check
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-black text-slate-900 block leading-tight">{rep.productName}</span>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">
                          Reported by @{rep.reportedBy} • {timeSince(rep.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <div className="text-left leadning-none">
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Catalog</span>
                          <span className="text-xs font-bold text-slate-500">R {rep.catalogPrice.toFixed(2)}</span>
                        </div>

                        <div className="text-left leading-none">
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">shelf spotted</span>
                          <span className="text-xs font-black text-slate-900">R {rep.shelfPrice.toFixed(2)}</span>
                        </div>

                        <div className={`text-left leading-none px-2 py-1 rounded-lg ${isUnder ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <span className="text-[8px] font-black uppercase tracking-wider block">{isUnder ? 'Cheaper In Store!' : 'Priscing Overrun'}</span>
                          <span className="text-[10px] font-black">
                            {isUnder ? '-' : '+'}{priceDiffPercent.toFixed(1)}% {isUnder ? 'saving' : 'mismatch'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-200/60 pt-3 sm:pt-0 gap-3">
                      <button 
                        onClick={() => handleUpvote(rep.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase cursor-pointer ${
                          rep.userVoted 
                            ? 'bg-[#FFE600] border-black text-black' 
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-500 hover:text-black'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Upvote ({rep.votes})</span>
                      </button>

                      {rep.status === 'pending' && (
                        <button 
                          onClick={() => {
                            handleVerify(rep.id);
                            setSuccessMsg('Report marked as verified by community check!');
                            setTimeout(() => setSuccessMsg(''), 5000);
                          }}
                          className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded border border-emerald-200 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-transparent transition-all cursor-pointer"
                        >
                          Verify Price Match
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {reports.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl space-y-2">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">No verification matches logged.</div>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Be the first to file a mismatch or spot cheaper shelf deals near you!</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
