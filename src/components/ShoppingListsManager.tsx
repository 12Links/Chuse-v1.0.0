import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Share2, 
  ListPlus, 
  ClipboardList, 
  Store, 
  TrendingDown, 
  Calendar, 
  PlusCircle, 
  Check, 
  CheckCircle2, 
  Circle,
  HelpCircle,
  PiggyBank,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Product, BasketItem } from '../types';
import { STORES } from '../data/catalog';

interface SavedList {
  id: string;
  name: string;
  budget: number;
  items: BasketItem[];
  createdAt: string;
}

interface ShoppingListsManagerProps {
  products: Product[];
  onAddToBasket: (productId: string) => void;
  currentBasket: BasketItem[];
}

export default function ShoppingListsManager({ products, onAddToBasket, currentBasket }: ShoppingListsManagerProps) {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListBudget, setNewListBudget] = useState<number>(500);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<string, boolean>>>({}); // listId -> productId -> boolean
  const [successMsg, setSuccessMsg] = useState('');

  // Load lists on mount
  useEffect(() => {
    const saved = localStorage.getItem('sa_saved_shopping_lists');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLists(parsed);
        if (parsed.length > 0) {
          setSelectedListId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse saved lists:', e);
      }
    } else {
      // Create some default list for cold start
      const defaultList: SavedList = {
        id: 'list-default',
        name: 'Weekly Pantry Refill',
        budget: 650,
        createdAt: new Date().toISOString().split('T')[0],
        items: [
          { productId: 'prod-milk-clover', quantity: 2 },
          { productId: 'prod-bread-sasko', quantity: 3 },
          { productId: 'prod-coffee-jacobs', quantity: 1 }
        ]
      };
      setLists([defaultList]);
      setSelectedListId('list-default');
      localStorage.setItem('sa_saved_shopping_lists', JSON.stringify([defaultList]));
    }
  }, []);

  const saveListsToStorage = (updatedLists: SavedList[]) => {
    setLists(updatedLists);
    localStorage.setItem('sa_saved_shopping_lists', JSON.stringify(updatedLists));
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const newList: SavedList = {
      id: `list-${Date.now()}`,
      name: newListName.trim(),
      budget: Number(newListBudget) || 500,
      items: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [...lists, newList];
    saveListsToStorage(updated);
    setSelectedListId(newList.id);
    setNewListName('');
    setNewListBudget(500);
    triggerSuccess('New list container created successfully!');
  };

  const handleDeleteList = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      const updated = lists.filter(list => list.id !== id);
      saveListsToStorage(updated);
      if (selectedListId === id) {
        setSelectedListId(updated.length > 0 ? updated[0].id : null);
      }
      triggerSuccess('List deleted.');
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const activeList = lists.find(list => list.id === selectedListId);

  // Add a product to the active list
  const handleAddProductToList = (productId: string) => {
    if (!selectedListId) return;

    const updated = lists.map(list => {
      if (list.id === selectedListId) {
        const existing = list.items.find(item => item.productId === productId);
        let newItems: BasketItem[];
        if (existing) {
          newItems = list.items.map(item => 
            item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          newItems = [...list.items, { productId, quantity: 1 }];
        }
        return { ...list, items: newItems };
      }
      return list;
    });

    saveListsToStorage(updated);
  };

  // Remove a product from the active list
  const handleRemoveProductFromList = (productId: string) => {
    if (!selectedListId) return;

    const updated = lists.map(list => {
      if (list.id === selectedListId) {
        return {
          ...list,
          items: list.items.filter(item => item.productId !== productId)
        };
      }
      return list;
    });

    saveListsToStorage(updated);
  };

  // Update quantity inside the list
  const handleUpdateQuantityInList = (productId: string, delta: number) => {
    if (!selectedListId) return;

    const updated = lists.map(list => {
      if (list.id === selectedListId) {
        return {
          ...list,
          items: list.items.map(item => {
            if (item.productId === productId) {
              const newQty = item.quantity + delta;
              return { ...item, quantity: Math.max(1, newQty) };
            }
            return item;
          })
        };
      }
      return list;
    });

    saveListsToStorage(updated);
  };

  // Check off an item (for in-store shopping simulation)
  const toggleCheckItem = (productId: string) => {
    if (!selectedListId) return;
    setCheckedItems(prev => {
      const listMap = prev[selectedListId] || {};
      return {
        ...prev,
        [selectedListId]: {
          ...listMap,
          [productId]: !listMap[productId]
        }
      };
    });
  };

  // Import active app basket into a new list
  const handleImportCurrentBasket = () => {
    if (currentBasket.length === 0) {
      alert('Your current basket is empty. Add products from the Product Directory first!');
      return;
    }

    const name = `Basket Import - ${new Date().toLocaleDateString('en-ZA')}`;
    const newList: SavedList = {
      id: `list-${Date.now()}`,
      name,
      budget: 800,
      items: [...currentBasket],
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [...lists, newList];
    saveListsToStorage(updated);
    setSelectedListId(newList.id);
    triggerSuccess('Imported current basket into new list!');
  };

  // Copy whole list items to the active basket optimizer
  const handleCopyToBasket = () => {
    if (!activeList || activeList.items.length === 0) return;
    
    activeList.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        onAddToBasket(item.productId);
      }
    });

    triggerSuccess(`Added all ${activeList.items.length} items to your active Basket Optimizer!`);
  };

  // Calculate prices per store for the selected list
  const calculateTotals = () => {
    if (!activeList || activeList.items.length === 0) return [];

    const storeTotals = STORES.map(store => {
      let total = 0;
      let missingItemsCount = 0;

      activeList.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const storePrice = prod.prices.find(p => p.storeId === store.id);
          if (storePrice && storePrice.inStock) {
            total += storePrice.price * item.quantity;
          } else {
            // fallback to national average or base estimation
            const genericPrice = prod.prices[0]?.price || 30;
            total += genericPrice * item.quantity;
            missingItemsCount++;
          }
        }
      });

      return {
        storeId: store.id,
        storeName: store.name,
        total,
        missingItemsCount
      };
    });

    // Sort by lowest price
    return storeTotals.sort((a, b) => a.total - b.total);
  };

  const totals = calculateTotals();
  const cheapestStore = totals[0];
  const mostExpensiveStore = totals[totals.length - 1];
  const maxSavings = cheapestStore && mostExpensiveStore ? (mostExpensiveStore.total - cheapestStore.total) : 0;

  // Filter products for suggestions inside list
  const suggestedProducts = products
    .filter(p => {
      if (searchQuery === '') return p.isPopular;
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             p.category.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .slice(0, 5);

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">Production Shopping Lists Manager</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Design weekly staple lists, track local budgets, and compare final basket optimization scores</p>
        </div>
        
        <button 
          onClick={handleImportCurrentBasket}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black bg-[#FFE600] border border-black text-black hover:bg-black hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ListPlus className="w-4 h-4" />
          <span>Import Live Basket</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: List Selectors & Creator */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-5.5 space-y-5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Your Saved Groceries Lists</span>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {lists.map(list => {
                const isActive = list.id === selectedListId;
                return (
                  <div 
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isActive 
                        ? 'bg-[#FFE600]/10 border-[#FFE600] ring-1 ring-[#FFE600]/30' 
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ClipboardList className={`w-4 h-4 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                      <div className="text-left leading-none">
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">{list.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase tracking-wide">
                          {list.items.length} items • Budget: R{list.budget}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(list.id, list.name);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {lists.length === 0 && (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <span className="text-xs text-slate-400 font-bold">No saved lists. Create one below!</span>
                </div>
              )}
            </div>
          </div>

          {/* Create New List */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5.5 space-y-4 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Create List Container</span>
            
            <form onSubmit={handleCreateList} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">List Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Monthly Pantry staples"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Allocated Budget (ZAR)</label>
                <input 
                  type="number"
                  placeholder="e.g. 500"
                  value={newListBudget}
                  onChange={e => setNewListBudget(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 text-xs font-semibold"
                  min="50"
                  max="10000"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-black text-white hover:bg-[#FFE600] hover:text-black transition-all rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Create New List
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Active List Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {activeList ? (
            <div className="space-y-6">
              
              {/* Header Profile Info */}
              <div className="bg-slate-900 text-white rounded-[28px] p-6 shadow-sm space-y-4.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE600]/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black uppercase tracking-tight text-white">{activeList.name}</h3>
                      <span className="bg-[#FFE600] text-black text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Active Workspace
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium block">Created on {activeList.createdAt}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopyToBasket}
                      className="px-3.5 py-1.8 bg-[#FFE600] text-black text-[10px] font-black uppercase tracking-wider rounded-lg border border-transparent hover:bg-white hover:border-black transition-all cursor-pointer"
                    >
                      Sync to Optimizer
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-850">
                  <div className="bg-slate-850 border border-slate-800 rounded-xl p-3">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Budget limit</span>
                    <span className="text-sm font-black text-slate-100 block mt-1">R {activeList.budget}</span>
                  </div>

                  <div className="bg-slate-850 border border-slate-800 rounded-xl p-3">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Cheapest Store</span>
                    <span className="text-sm font-black text-[#FFE600] block mt-1 truncate">
                      {cheapestStore ? cheapestStore.storeName : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-slate-850 border border-slate-800 rounded-xl p-3">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Estimated Total</span>
                    <span className="text-sm font-black text-slate-100 block mt-1">
                      {cheapestStore ? `R ${cheapestStore.total.toFixed(2)}` : 'R 0.00'}
                    </span>
                  </div>

                  <div className="bg-slate-850 border border-slate-800 rounded-xl p-3">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Max Saving Spread</span>
                    <span className="text-sm font-black text-emerald-400 block mt-1">
                      R {maxSavings.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Budget alert */}
                {cheapestStore && cheapestStore.total > activeList.budget && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] p-3 rounded-xl flex items-center gap-2 font-bold uppercase tracking-wider">
                    ⚠️ Warning: Cheapest index pricing R{cheapestStore.total.toFixed(2)} exceeds your allocated list budget limit of R{activeList.budget}! Consider removing 1-2 non-staples.
                  </div>
                )}
              </div>

              {/* Shopping items list */}
              <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">List Products Index ({activeList.items.length})</span>
                  <span className="text-[9px] text-slate-400 font-bold">Check off items as you walk in store to stay on track</span>
                </div>

                <div className="space-y-2.5">
                  {activeList.items.map(item => {
                    const prod = products.find(p => p.id === item.productId);
                    if (!prod) return null;
                    const isChecked = checkedItems[selectedListId!]?.[item.productId] || false;
                    
                    return (
                      <div 
                        key={item.productId}
                        className={`flex items-center justify-between p-3 border rounded-2xl transition-all ${
                          isChecked ? 'bg-slate-50 border-slate-200/50 opacity-60' : 'bg-white border-slate-100 hover:border-slate-300/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleCheckItem(item.productId)}
                            className="text-slate-400 hover:text-black transition-colors"
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                          
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.name} 
                            className="w-10 h-10 object-cover rounded-lg bg-slate-50 border border-slate-100"
                          />

                          <div className="text-left">
                            <span className={`text-xs font-bold text-slate-800 block ${isChecked ? 'line-through text-slate-400' : ''}`}>{prod.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{prod.unit} • {prod.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Quantity adjustments */}
                          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200/60">
                            <button 
                              onClick={() => handleUpdateQuantityInList(item.productId, -1)}
                              className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-xs font-black shadow-xs hover:bg-slate-50"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantityInList(item.productId, 1)}
                              className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-xs font-black shadow-xs hover:bg-slate-50"
                            >
                              +
                            </button>
                          </div>

                          <button 
                            onClick={() => handleRemoveProductFromList(item.productId)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {activeList.items.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl space-y-3">
                      <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Your list container is empty</div>
                      <p className="text-[10px] text-slate-400 max-w-sm mx-auto font-medium">Use the quick product compiler below or head to the Product Directory to add items to this workspace list.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Item Search and Compiler */}
              <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quick List Product Compiler</span>
                
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search standard SA grocery catalogue (e.g. coffee, milk, sugar)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-4 py-2.5 bg-slate-50 border border-slate-250/80 rounded-xl focus:outline-none focus:border-yellow-400 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 pt-1.5">
                  {suggestedProducts.map(prod => {
                    const isAlreadyIn = activeList.items.some(item => item.productId === prod.id);
                    return (
                      <div 
                        key={prod.id}
                        className="flex items-center justify-between p-2.5 border border-slate-100 hover:border-slate-200 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2.5 text-left">
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.name} 
                            className="w-7 h-7 object-cover rounded bg-slate-50"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-none">{prod.name}</span>
                            <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{prod.unit} • {prod.category}</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            handleAddProductToList(prod.id);
                            triggerSuccess(`Added ${prod.name} to "${activeList.name}"!`);
                          }}
                          className="flex items-center gap-1 text-[10px] font-black uppercase bg-[#FFE600] px-2.5 py-1.5 rounded-lg border border-transparent hover:border-black transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isAlreadyIn ? 'Add Extra' : 'Add to List'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Competitive Totals comparison */}
              {activeList.items.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Comparative Multi-Store Basket Price Totals</span>
                  
                  <div className="space-y-2.5">
                    {totals.map((t, idx) => {
                      const isCheapest = idx === 0;
                      const isMostExpensive = idx === totals.length - 1;
                      const percentAboveCheapest = isCheapest ? 0 : ((t.total - cheapestStore.total) / cheapestStore.total) * 100;
                      
                      return (
                        <div 
                          key={t.storeId}
                          className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all ${
                            isCheapest 
                              ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300/10 shadow-xs' 
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${
                              isCheapest ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {idx + 1}
                            </div>
                            
                            <div className="text-left">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                {t.storeName}
                                {isCheapest && (
                                  <span className="bg-emerald-500 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">Cheapest Store</span>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wide">
                                {t.missingItemsCount > 0 ? `Estimated (${t.missingItemsCount} items missing stock)` : '100% In-Stock'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-sm font-black block ${isCheapest ? 'text-emerald-600' : 'text-slate-800'}`}>R {t.total.toFixed(2)}</span>
                            {!isCheapest && (
                              <span className="text-[9px] text-rose-500 font-bold block mt-0.5 uppercase tracking-wider">+{percentAboveCheapest.toFixed(1)}% extra cost</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center space-y-4">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">No Grocery List Workspace Selected</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Select a list from the side panel or create a brand new container to start planning your multi-supermarket comparative budget optimizations.</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
