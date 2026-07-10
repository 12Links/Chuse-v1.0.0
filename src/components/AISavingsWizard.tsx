import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  ShoppingBag, 
  Flame, 
  RefreshCw,
  Gift
} from 'lucide-react';
import { Product, BasketItem, UserProfile } from '../types';

interface AISavingsWizardProps {
  products: Product[];
  basket: BasketItem[];
  user: UserProfile | null | undefined;
  onAuthRequest: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AISavingsWizard({ products, basket, user, onAuthRequest }: AISavingsWizardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState<number>(() => {
    const saved = localStorage.getItem('guest_ai_wizard_messages');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build basket details context to show above or pass to the API
  const basketDetails = basket.map(item => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return null;
    return {
      name: prod.name,
      unit: prod.unit,
      category: prod.category,
      quantity: item.quantity,
      prices: prod.prices.map(pr => ({ storeId: pr.storeId, price: pr.price, onSpecial: pr.onSpecial, inStock: pr.inStock }))
    };
  }).filter(Boolean);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          text: `**Howzit! I am the chuse. Saving Wizard!** 🌟

I am your personalized, Gemini-powered South African grocery budget coach and retail strategist. I scan woolies, checkers, pnp, shoprite, spar, and boxer to find you the sweetest household discounts!

${basketDetails.length > 0 
  ? `I see you have **${basketDetails.length} item(s)** in your shopping basket right now! Click one of the quick optimization chips below, or ask me anything about making your ZAR Rands stretch further today! 🇿🇦` 
  : "Your basket is currently empty! Try adding Sasko bread, Clover milk, or fresh produce from the directory, then ask me to optimize, split, or suggest budget meals! 🛒"
}`,
          timestamp: new Date()
        }
      ]);
    }
  }, [basketDetails.length]);

  // Keep chat bottom-scrolled
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    if (!user && guestMessageCount >= 5) {
      onAuthRequest();
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-limit-${Date.now()}`,
          role: 'assistant',
          text: `**You've reached your free message limit!** 🚀\n\nTo continue chatting with the chuse. Saving Wizard and unlock unlimited queries, please sign in or create a free account. It's quick, easy, and gives you access to all our powerful budgeting tools!`,
          timestamp: new Date()
        }
      ]);
      return;
    }

    setError(null);
    const userMsgId = `user-${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: textToSend,
        timestamp: new Date()
      }
    ];

    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    if (!user) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      localStorage.setItem('guest_ai_wizard_messages', newCount.toString());
    }

    try {
      // Package conversation and send to Express proxy endpoint
      const history = newMessages
        .filter(m => m.id !== 'welcome-msg' && m.id !== userMsgId)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text
        }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          basket: basketDetails,
          history
        })
      });

      if (!response.ok) {
        throw new Error("Unable to communicate with the chuse. AI indexes.");
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.text,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to receive savings response. Let's recheck the server link.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    {
      label: "Split basket for maximum savings",
      prompt: "Can you analyze my current basket and split it? Show me exactly which stores (Checkers, Woolworths, SPAR, Shoprite, PnP etc.) are cheapest for each item so I can split my trip and pay the absolute minimum."
    },
    {
      label: "Suggest smart house-brand swaps",
      prompt: "Look at the items in my basket and suggest generic house-brand alternatives (such as SPAR Brand, PnP No Name, Checkers House Brand, or Shoprite Ritebrand) that are equivalent high quality but cost less. Tell me how much I will save."
    },
    {
      label: "Cheap South African recipe bangers",
      prompt: "Based on my current basket of products, what is a lekke, budget-friendly South African dinner recipe I can cook? Tell me what other basic pantry staples I'll need."
    },
    {
      label: "Who has the absolute cheapest bread & milk?",
      prompt: "Which South African supermarkets currently have Sasko bread and Clover full cream milk at the lowest prices? Include SPAR and Boxer in the comparison."
    }
  ];

  const parseBold = (content: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-extrabold text-slate-950">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // If empty line, return a spacer
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Headers starting with ### or ## or #
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-xs font-black text-slate-900 mt-4 mb-1.5 uppercase tracking-wider">
            {parseBold(trimmed.replace('###', '').trim())}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className="text-sm font-black text-slate-900 mt-5 mb-2 uppercase tracking-wide border-b border-slate-100 pb-1">
            {parseBold(trimmed.replace('##', '').trim())}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={idx} className="text-base font-black text-slate-900 mt-5 mb-2 uppercase tracking-wide border-b border-slate-200 pb-1">
            {parseBold(trimmed.replace('#', '').trim())}
          </h2>
        );
      }

      // Unordered list bullet
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const listText = trimmed.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2.5 my-2 pl-1.5">
            <span className="text-[#FFE600] font-black shrink-0 text-sm leading-none select-none">▪</span>
            <div className="text-xs text-slate-600 font-medium leading-relaxed">
              {parseBold(listText)}
            </div>
          </div>
        );
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const num = numMatch[1];
        const numText = numMatch[2];
        return (
          <div key={idx} className="flex items-start gap-2.5 my-2 pl-1.5">
            <span className="text-slate-500 font-bold shrink-0 text-[10px] font-mono leading-none bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">{num}</span>
            <div className="text-xs text-slate-600 font-medium leading-relaxed">
              {parseBold(numText)}
            </div>
          </div>
        );
      }

      return (
        <p key={idx} className="my-1.5 leading-relaxed text-xs text-slate-600 font-medium">
          {parseBold(line)}
        </p>
      );
    });
  };

  return (
    <div id="ai-savings-wizard-container" className="max-w-4xl mx-auto space-y-6">
      
      {/* Premium Elegant Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-yellow-400 text-slate-950 text-[8.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              Gemini AI
            </span>
            <span className="bg-slate-950 text-[#FFE600] text-[8.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-slate-800">
              South African Grounding Indexes
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-2 tracking-tight">
            <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-400 animate-pulse shrink-0" />
            chuse. Saving Wizard
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Analyze basket configurations, discover secret house-specials, and compare live supermarket split-saving plans
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Chat box panel */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100/85 shadow-xs flex flex-col h-[560px] overflow-hidden">
          
          {/* Header */}
          <div className="bg-slate-950 text-white px-6 py-4.5 flex items-center justify-between shrink-0 border-b border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-black font-black shadow-inner">
                <Sparkles className="w-4.5 h-4.5 text-[#FFE600] fill-[#FFE600]" />
              </div>
              <div>
                <span className="text-xs font-black block tracking-tight leading-none text-white">Saving Wizard v3.5</span>
                <span className="text-[9px] uppercase tracking-widest text-[#FFE600] font-black block mt-1">Active Budget Coach</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              Live context
            </div>
          </div>

          {/* Message scroll viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/25">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-white shrink-0 shadow-xs mt-1">
                      <Bot className="w-4 h-4 text-[#FFE600]" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs font-medium shadow-3xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-950 text-white border border-slate-850 rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <div className="space-y-1">
                        {formatText(msg.text)}
                      </div>
                    )}
                    <span className={`text-[8px] block mt-2 text-right font-black tracking-wider uppercase font-mono ${
                      msg.role === 'user' ? 'text-[#FFE600]' : 'text-slate-400'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-[#FFE600] border border-yellow-400 flex items-center justify-center text-slate-950 shrink-0 shadow-xs mt-1 uppercase font-black text-[10px] font-mono">
                      {user ? <User className="w-4 h-4" /> : 'U'}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5 justify-start"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-white shrink-0 animate-spin">
                  <RefreshCw className="w-3.5 h-3.5 text-[#FFE600]" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 text-xs shadow-3xs flex items-center gap-3">
                  <div className="flex gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-250" />
                    <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Computing savings indexes...</span>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form input field */}
          <div className="p-4.5 border-t border-slate-100 bg-white shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }} 
              className="flex gap-3"
            >
              <input
                type="text"
                placeholder={!user && guestMessageCount >= 5 ? "Sign in to continue chatting..." : "Ask budget coach about retail split-saving, house brands..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading || (!user && guestMessageCount >= 5)}
                className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] focus:bg-white font-semibold text-slate-800 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading || (!user && guestMessageCount >= 5)}
                className="p-3.5 bg-[#FFE600] hover:bg-yellow-400 text-slate-950 rounded-2xl shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-3xs flex items-center justify-center font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            {!user && (
              <div className="mt-3 flex items-center justify-between px-1">
                <p className="text-[9.5px] text-slate-400 font-bold">
                  {Math.max(0, 5 - guestMessageCount)} free messages remaining
                </p>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                  <div 
                    className="bg-[#FFE600] h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, 100 - (guestMessageCount * 20))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Quick-actions section */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 space-y-4 shadow-3xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500 shrink-0" />
              Quick Budget Guides
            </h3>
            <p className="text-[11.5px] text-slate-500 leading-relaxed font-bold">
              Tap any chip below to prompt the Saving Wizard instantly for calculations:
            </p>

            <div className="flex flex-col gap-2.5">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="w-full text-left p-3.5 rounded-2xl bg-white border border-slate-200/60 hover:border-[#FFE600] hover:shadow-3xs transition-all text-[11px] font-black text-slate-700 flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span className="truncate pr-2">{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-950 shrink-0 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Current basket info box */}
          <div className="bg-slate-950 text-white rounded-3xl p-5 space-y-4 relative overflow-hidden border border-slate-900 shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFE600]/5 rounded-full blur-2xl" />
            
            <h3 className="text-xs font-black text-[#FFE600] uppercase tracking-widest flex items-center gap-2 select-none">
              <ShoppingBag className="w-4 h-4" />
              Active Shopping Context
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-900 pb-2.5">
                <span className="text-slate-400 font-bold">Items in Basket:</span>
                <span className="font-extrabold text-[#FFE600]">{basketDetails.length} items</span>
              </div>

              {basketDetails.length > 0 ? (
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 pt-1">
                  {basketDetails.map((item, idx) => {
                    if (!item) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-850 text-[10px]">
                        <span className="truncate font-black text-slate-200">{item.name}</span>
                        <span className="font-mono text-[9px] text-[#FFE600] px-2 py-0.5 rounded-md bg-white/5 font-bold shrink-0 ml-2 border border-white/5">
                          {item.quantity}x {item.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-450 italic leading-relaxed pt-1">
                  Your comparing bento doesn't have products registered. Add items from the catalog or seek generic tips from the Wizard!
                </p>
              )}
            </div>
            
            <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-[#FFE600] bg-white/5 px-2.5 py-1 rounded-full tracking-wider border border-white/5 select-none">
                <Flame className="w-3 h-3 text-[#FFE600] fill-[#FFE600]" />
                SPAR Cards Integrated
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
