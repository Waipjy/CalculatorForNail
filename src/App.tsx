import React, { useState, useEffect } from 'react';
import { 
  Plus, Minus, Trash2, Copy, 
  Settings, Sparkles, Edit3, Check, 
  Hash, X, AlertCircle, Palette, Heart,
  Percent
} from 'lucide-react';

// --- Types ---

type ItemType = 'toggle' | 'counter';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  type: ItemType;
}

interface Category {
  id: string;
  title: string;
  items: MenuItem[];
}

interface Modifier {
  id: string;
  name: string;
  value: number; // Percentage (e.g., 10 for +10%, -10 for -10%)
}

// Data structure for URL and Storage
interface AppData {
  menu: Category[];
  modifiers: Modifier[];
}

interface Cart {
  [itemId: string]: number;
}

// --- Helpers ---

// Safe Base64 encoding for Unicode
const encodeConfig = (data: AppData): string => {
  try {
    const json = JSON.stringify(data);
    return window.btoa(unescape(encodeURIComponent(json)));
  } catch (e) {
    console.error("Encoding failed", e);
    return "";
  }
};

// Safe Base64 decoding
const decodeConfig = (hash: string): AppData | null => {
  try {
    const json = decodeURIComponent(escape(window.atob(hash)));
    const parsed = JSON.parse(json);
    // Backward compatibility check: if parsed is array, it's the old format (just menu)
    if (Array.isArray(parsed)) {
      return { menu: parsed, modifiers: [] };
    }
    return parsed;
  } catch (e) {
    console.error("Decoding failed", e);
    return null;
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Main Component ---

export default function App() {
  // Mode: 'edit' = Developer, 'view' = User
  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  
  // Data State
  const [menu, setMenu] = useState<Category[]>([
    {
      id: 'cat-basic',
      title: '基礎手部護理',
      items: [
        { id: 'item-care', name: '精緻前置保養', price: 500, type: 'toggle' },
        { id: 'item-removal', name: '卸甲重做', price: 300, type: 'toggle' }
      ]
    },
    {
      id: 'cat-gel',
      title: '凝膠設計款式',
      items: [
        { id: 'item-solid', name: '單色凝膠', price: 1000, type: 'toggle' },
        { id: 'item-cat', name: '貓眼 / 鏡面', price: 1200, type: 'toggle' }
      ]
    }
  ]);

  const [modifiers, setModifiers] = useState<Modifier[]>([
    { id: 'mod-vip', name: '熟客優惠', value: -10 }
  ]);

  // Cart State (User Mode)
  const [cart, setCart] = useState<Cart>({});
  const [activeModifiers, setActiveModifiers] = useState<Set<string>>(new Set());

  // UI State
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEnvironmentSafe, setIsEnvironmentSafe] = useState(true);

  // --- Initialization & Persistence ---

  useEffect(() => {
    // Check environment
    const isSafe = window.location.protocol !== 'blob:' && window.location.protocol !== 'about:';
    setIsEnvironmentSafe(isSafe);

    // 1. Priority: URL Hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      const loadedData = decodeConfig(hash);
      if (loadedData) {
        setMenu(loadedData.menu);
        setModifiers(loadedData.modifiers || []);
        setMode('view'); // Default to view mode if hash exists
        setShareUrl(window.location.href);
        return;
      }
    }

    // 2. Fallback: Local Storage (Cache)
    // Only load from cache if no hash is present (or hash failed)
    try {
      const cached = localStorage.getItem('nailCalcData');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.menu) setMenu(parsedCache.menu);
        if (parsedCache.modifiers) setModifiers(parsedCache.modifiers);
      }
    } catch (e) {
      console.warn("Failed to load cache", e);
    }
    
    setShareUrl(window.location.href);
  }, []);

  // Save to LocalStorage and Update URL when Data changes
  useEffect(() => {
    const appData: AppData = { menu, modifiers };
    
    // Save to Cache (only relevant in edit mode context mostly, but good to save state)
    if (mode === 'edit') {
       localStorage.setItem('nailCalcData', JSON.stringify(appData));
    }

    // Update URL
    if (mode === 'edit') {
      const hash = encodeConfig(appData);
      const newUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
      setShareUrl(newUrl);

      if (isEnvironmentSafe) {
        try {
          window.history.replaceState(null, '', `#${hash}`);
        } catch (e) {
          console.warn("Could not update history state", e);
        }
      }
    }
  }, [menu, modifiers, mode, isEnvironmentSafe]);

  // --- Handlers: Developer Mode ---

  const addCategory = () => {
    setMenu([...menu, { id: generateId(), title: '新服務類別', items: [] }]);
  };

  const removeCategory = (catId: string) => {
    if (confirm('確定要刪除此分類及其所有項目嗎？')) {
      setMenu(menu.filter(c => c.id !== catId));
    }
  };

  const updateCategoryTitle = (catId: string, title: string) => {
    setMenu(menu.map(c => c.id === catId ? { ...c, title } : c));
  };

  const addItem = (catId: string) => {
    setMenu(menu.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: [...c.items, { id: generateId(), name: '新項目', price: 0, type: 'toggle' }]
        };
      }
      return c;
    }));
  };

  const removeItem = (catId: string, itemId: string) => {
    setMenu(menu.map(c => {
      if (c.id === catId) {
        return { ...c, items: c.items.filter(i => i.id !== itemId) };
      }
      return c;
    }));
  };

  const updateItem = (catId: string, itemId: string, field: keyof MenuItem, value: any) => {
    setMenu(menu.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
        };
      }
      return c;
    }));
  };

  // Modifier Handlers
  const addModifier = () => {
    setModifiers([...modifiers, { id: generateId(), name: '新折扣/費用', value: -10 }]);
  };

  const updateModifier = (id: string, field: keyof Modifier, value: any) => {
    setModifiers(modifiers.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeModifier = (id: string) => {
    setModifiers(modifiers.filter(m => m.id !== id));
  };

  // --- Handlers: User Mode ---

  const updateCart = (itemId: string, delta: number, type: ItemType) => {
    setCart(prev => {
      const currentQty = prev[itemId] || 0;
      let newQty = currentQty + delta;

      if (type === 'toggle') {
        newQty = currentQty > 0 ? 0 : 1;
      } else {
        if (newQty < 0) newQty = 0;
      }

      const newCart = { ...prev, [itemId]: newQty };
      if (newQty === 0) delete newCart[itemId];
      return newCart;
    });
  };

  const toggleModifier = (modId: string) => {
    setActiveModifiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modId)) {
        newSet.delete(modId);
      } else {
        newSet.add(modId);
      }
      return newSet;
    });
  };

  const calculateData = () => {
    let subtotal = 0;
    menu.forEach(cat => {
      cat.items.forEach(item => {
        const qty = cart[item.id] || 0;
        subtotal += item.price * qty;
      });
    });

    let total = subtotal;
    const appliedModifiers: { name: string, value: number, amount: number }[] = [];

    modifiers.forEach(mod => {
      if (activeModifiers.has(mod.id)) {
        const amount = Math.round(subtotal * (mod.value / 100));
        total += amount;
        appliedModifiers.push({ ...mod, amount });
      }
    });

    return { subtotal, total: Math.max(0, total), appliedModifiers };
  };

  const generateReceipt = () => {
    const { subtotal, total, appliedModifiers } = calculateData();
    const lines: string[] = [];
    
    menu.forEach(cat => {
      cat.items.forEach(item => {
        const qty = cart[item.id] || 0;
        if (qty > 0) {
          lines.push(`${item.name} ${qty > 1 ? `x${qty}` : ''} $${item.price * qty}`);
        }
      });
    });

    if (lines.length === 0) return "尚未選擇項目";

    let text = `✦ 梨語美甲 施作明細 ✦\n\n${lines.join('\n')}`;
    
    if (appliedModifiers.length > 0) {
      text += `\n\n小計: $${subtotal}`;
      appliedModifiers.forEach(mod => {
        const sign = mod.amount > 0 ? '+' : '';
        text += `\n${mod.name} (${mod.value}%): ${sign}$${mod.amount}`;
      });
    }

    text += `\n----------------\n總金額: $${total}`;
    return text;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // --- Renders ---

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-700 pb-48 selection:bg-rose-100">
      {/* Top Navigation */}
      <div className="bg-[#FAFAF9]/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800 flex items-center gap-3 tracking-wide">
          {mode === 'edit' ? <Settings className="w-5 h-5 text-stone-500" /> : <Sparkles className="w-5 h-5 text-rose-400" />}
          {mode === 'edit' ? '美甲價目表設計' : '美甲預約試算'}
        </h1>
        <button 
          onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
          className="text-xs font-medium px-4 py-2 bg-white text-stone-600 border border-stone-200 rounded-full hover:bg-stone-100 hover:text-stone-800 transition-all shadow-sm"
        >
          {mode === 'edit' ? '預覽客戶介面' : '編輯服務項目'}
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto p-6 space-y-8">
        
        {/* --- Developer Mode UI --- */}
        {mode === 'edit' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Category Section */}
            {menu.map((category) => (
              <div key={category.id} className="group relative">
                {/* Category Header */}
                <div className="mb-4 flex gap-3 items-center px-2">
                  <div className="w-1 h-6 bg-rose-300 rounded-full"></div>
                  <input 
                    type="text" 
                    value={category.title}
                    onChange={(e) => updateCategoryTitle(category.id, e.target.value)}
                    className="flex-1 bg-transparent text-xl font-bold text-stone-800 focus:outline-none focus:border-b focus:border-rose-300 transition-all placeholder:text-stone-300"
                    placeholder="輸入分類名稱..."
                  />
                  <button 
                    onClick={() => removeCategory(category.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-rose-400 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3 pl-4 border-l border-stone-100 ml-2.5">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:border-rose-100 transition-colors">
                      <div className="flex-1 flex gap-3">
                         <input 
                          type="text" 
                          value={item.name}
                          onChange={(e) => updateItem(category.id, item.id, 'name', e.target.value)}
                          className="flex-1 min-w-0 bg-stone-50 px-3 py-2 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-rose-200"
                          placeholder="項目名稱"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                          <input 
                            type="number" 
                            value={item.price}
                            onChange={(e) => updateItem(category.id, item.id, 'price', Number(e.target.value))}
                            className="w-full bg-stone-50 pl-6 pr-3 py-2 rounded-lg text-sm text-stone-700 font-sans-num focus:outline-none focus:ring-1 focus:ring-rose-200"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 items-center justify-end">
                         <div className="flex bg-stone-50 p-1 rounded-lg">
                            <button
                              onClick={() => updateItem(category.id, item.id, 'type', 'toggle')}
                              className={`p-1.5 rounded-md transition-all ${item.type === 'toggle' ? 'bg-white shadow-sm text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}
                              title="單選項目"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateItem(category.id, item.id, 'type', 'counter')}
                              className={`p-1.5 rounded-md transition-all ${item.type === 'counter' ? 'bg-white shadow-sm text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}
                              title="複選數量"
                            >
                              <Hash className="w-4 h-4" />
                            </button>
                         </div>
                         <button 
                            onClick={() => removeItem(category.id, item.id)}
                            className="text-stone-300 hover:text-rose-400 p-1.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addItem(category.id)}
                    className="mt-2 text-sm text-stone-500 hover:text-rose-500 font-medium flex items-center gap-1.5 px-2 py-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> 新增服務項目
                  </button>
                </div>
              </div>
            ))}

            <button 
              onClick={addCategory}
              className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-500 font-medium hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/30 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> 增加新的服務類別
            </button>

            {/* Modifiers Section */}
            <div className="pt-8 border-t border-stone-200">
               <div className="mb-4 flex gap-2 items-center">
                  <Percent className="w-5 h-5 text-stone-400" />
                  <h3 className="text-lg font-bold text-stone-800">額外費用與折扣 (Percentage)</h3>
               </div>
               
               <div className="space-y-3">
                 {modifiers.map(mod => (
                   <div key={mod.id} className="flex gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 items-center">
                      <input 
                        type="text" 
                        value={mod.name}
                        onChange={(e) => updateModifier(mod.id, 'name', e.target.value)}
                        className="flex-1 bg-white px-3 py-2 rounded border border-stone-200 text-sm focus:border-rose-300 focus:outline-none"
                        placeholder="名稱 (如: 服務費)"
                      />
                      <div className="relative w-32">
                        <input 
                          type="number" 
                          value={mod.value}
                          onChange={(e) => updateModifier(mod.id, 'value', Number(e.target.value))}
                          className="w-full bg-white pl-3 pr-6 py-2 rounded border border-stone-200 text-sm font-sans-num focus:border-rose-300 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">%</span>
                      </div>
                      <button 
                        onClick={() => removeModifier(mod.id)}
                        className="p-2 text-stone-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                 ))}
                 <button 
                    onClick={addModifier}
                    className="text-sm text-stone-500 hover:text-rose-500 font-medium flex items-center gap-1.5 px-2 py-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> 新增折扣/費用選項
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* --- User Mode UI --- */}
        {mode === 'view' && (
           <div className="space-y-10 animate-in fade-in duration-700">
             {menu.map((category) => (
               <div key={category.id} className="relative">
                 <div className="flex items-center gap-4 mb-5">
                    <h2 className="text-xl font-bold text-stone-800 tracking-wide">{category.title}</h2>
                    <div className="h-px bg-stone-200 flex-1"></div>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                   {category.items.map((item) => {
                     const qty = cart[item.id] || 0;
                     const isSelected = qty > 0;
                     
                     return (
                       <div 
                        key={item.id} 
                        className={`
                          group relative flex items-center justify-between p-5 rounded-xl border transition-all duration-300 cursor-pointer
                          ${isSelected 
                            ? 'bg-[#FDF2F4] border-rose-200 shadow-md shadow-rose-100/50' 
                            : 'bg-white border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md'
                          }
                        `}
                        onClick={() => {
                          if (item.type === 'toggle') updateCart(item.id, 1, 'toggle');
                        }}
                       >
                         <div>
                           <div className={`font-medium text-lg mb-1 transition-colors ${isSelected ? 'text-rose-900' : 'text-stone-700'}`}>
                             {item.name}
                           </div>
                           <div className={`font-sans-num text-sm tracking-wide ${isSelected ? 'text-rose-700' : 'text-stone-400'}`}>
                             NT$ {item.price}
                           </div>
                         </div>

                         {/* Controls */}
                         <div onClick={(e) => e.stopPropagation()}>
                            {item.type === 'toggle' ? (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-rose-400 text-white scale-110' : 'bg-stone-100 text-stone-300 group-hover:bg-stone-200'}`}>
                                <Heart className={`w-4 h-4 ${isSelected ? 'fill-current' : ''}`} />
                              </div>
                            ) : (
                              <div className={`flex items-center gap-3 rounded-full p-1 border transition-colors ${isSelected ? 'bg-white border-rose-100' : 'bg-stone-50 border-stone-100'}`}>
                                <button 
                                  onClick={() => updateCart(item.id, -1, 'counter')}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-stone-100 text-stone-500 shadow-sm border border-stone-100 transition-colors disabled:opacity-50"
                                  disabled={qty === 0}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className={`w-6 text-center font-sans-num font-medium ${qty > 0 ? 'text-rose-600' : 'text-stone-400'}`}>
                                  {qty}
                                </span>
                                <button 
                                  onClick={() => updateCart(item.id, 1, 'counter')}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-400 hover:bg-rose-500 text-white shadow-sm shadow-rose-200 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             ))}

             {/* Active Modifiers in View Mode */}
             {modifiers.length > 0 && (
               <div className="pt-4 pb-2">
                 <div className="flex items-center gap-2 mb-3 px-1">
                   <Percent className="w-4 h-4 text-stone-400" />
                   <span className="text-sm font-bold text-stone-500 uppercase tracking-wider">折扣與其他費用</span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {modifiers.map(mod => {
                     const isActive = activeModifiers.has(mod.id);
                     return (
                       <button
                         key={mod.id}
                         onClick={() => toggleModifier(mod.id)}
                         className={`
                           px-4 py-2 rounded-full text-sm font-medium border transition-all
                           ${isActive 
                             ? 'bg-stone-800 text-white border-stone-800 shadow-lg' 
                             : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                           }
                         `}
                       >
                         {mod.name} <span className="font-sans-num ml-1">{mod.value > 0 ? '+' : ''}{mod.value}%</span>
                       </button>
                     )
                   })}
                 </div>
               </div>
             )}
             
             {/* Spacer for sticky footer */}
             <div className="h-32"></div>
           </div>
        )}
      </div>

      {/* --- Sticky Footer --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] p-5 pb-8 z-20">
        <div className="max-w-xl mx-auto">
          {mode === 'edit' ? (
            // Developer Footer
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">分享連結 (自動更新)</label>
              <div className="flex gap-3">
                <div className={`flex-1 rounded-lg px-4 py-3 text-xs font-mono truncate border flex items-center ${isEnvironmentSafe ? 'bg-stone-50 border-stone-200 text-stone-500' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {isEnvironmentSafe ? (
                    shareUrl
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      部署後即可取得完整分享連結
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => isEnvironmentSafe ? copyToClipboard(shareUrl) : alert('請先將網頁部署到正式環境（如 GitHub Pages）才能使用分享功能。')}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all shadow-lg
                    ${!isEnvironmentSafe ? 'bg-stone-300 cursor-not-allowed' : copied ? 'bg-emerald-500 shadow-emerald-200' : 'bg-stone-800 hover:bg-stone-700 hover:scale-105 active:scale-95 shadow-stone-200'}
                  `}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已複製' : '複製'}
                </button>
              </div>
            </div>
          ) : (
            // User Footer
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <span className="text-stone-500 text-sm font-medium tracking-wide">預估總金額</span>
                <span className="text-4xl font-serif text-rose-900 font-medium">
                  <span className="text-xl mr-1 text-stone-400 font-sans-num">$</span>
                  <span className="font-sans-num">{calculateData().total}</span>
                </span>
              </div>
              <div className="flex gap-3 items-stretch h-20">
                 {/* Scrollable Receipt Preview */}
                 <div className="flex-1 px-4 py-3 text-xs text-stone-500 leading-relaxed bg-stone-50 rounded-lg border border-stone-100 overflow-y-auto whitespace-pre-wrap font-mono [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {calculateData().total === 0 && activeModifiers.size === 0 ? (
                      <span className="text-stone-400 italic flex h-full items-center justify-center">
                        尚未選擇任何服務...
                      </span>
                    ) : (
                      generateReceipt()
                    )}
                 </div>
                 <button 
                  onClick={() => copyToClipboard(generateReceipt())}
                  disabled={calculateData().total === 0 && activeModifiers.size === 0}
                  className={`
                    flex-shrink-0 flex items-center justify-center gap-2 px-6 rounded-xl font-bold text-white shadow-xl transition-all
                    ${calculateData().total === 0 && activeModifiers.size === 0
                      ? 'bg-stone-300 cursor-not-allowed shadow-none' 
                      : copied 
                        ? 'bg-stone-700 scale-95' 
                        : 'bg-rose-400 hover:bg-rose-500 hover:scale-105 active:scale-95 shadow-rose-200'
                    }
                  `}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span className="hidden sm:inline">{copied ? '已複製' : '複製報價'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}