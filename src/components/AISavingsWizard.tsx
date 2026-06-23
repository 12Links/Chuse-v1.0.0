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
  user: UserProfile | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AISavingsWizard({ products, basket, user }: AISavingsWizardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const formatText = (text: string) => {
    // Simple robust markdown parsing for linebreaks, bolding, list bullets
    return text.split('\n').map((line, idx) => {
      let content = line;
      
      // Handle bold tags: **text**
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

      const hasText = parts.length > 0;
      const displayContent = hasText ? parts : content;

      // Unordered list bullet
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const listText = line.trim().substring(2);
        return (
          <li key={idx} className="list-disc ml-5 pl-1 my-1 text-xs text-slate-700 font-medium leading-relaxed">
            {listText}
          </li>
        );
      }

      // Headers starting with ### or ## or #
      if (line.trim().startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm font-black text-slate-900 mt-4 mb-2 uppercase tracking-wide">
            {line.replace('###', '').trim()}
          </h4>
        );
      }
      if (line.trim().startsWith('##')) {
        return (
          <h3 key={idx} className="text-base font-black text-slate-900 mt-5 mb-2.5 uppercase tracking-wide border-b border-slate-100 pb-1">
            {line.replace('##', '').trim()}
          </h3>
        );
      }

      return (
        <p key={idx} className="my-1.5 leading-relaxed text-xs text-slate-700 font-medium">
          {displayContent}
        </p>
      );
    });
  };

  return (
    <div id="ai-savings-wizard-container" className="max-w-4xl mx-auto space-y-6">
      
      {/* Dynamic Grid Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              Gemini AI
            </span>
            <span className="bg-slate-900 text-[#FFE600] text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              South African Indexes Grounded
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-2 mt-2">
            <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-400" />
            chuse. Saving Wizard
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Optimise bento basket limits, research secret house-specials, and configure South African retail split-saving plans
          </p>
        </div>
      </div>

      {/* Main UI Interface split: Chat on left, context / stats on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Chat box panel */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFE600] flex items-center justify-center text-black font-black shadow-inner">
                <Sparkles className="w-4.5 h-4.5 text-black fill-yellow-400" />
              </div>
              <div>
                <span className="text-xs font-black block tracking-tight leading-none text-[#FFE600]">Saving Wizard v3.5</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black block mt-1">Active Budget Coach</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Context
            </div>
          </div>

          {/* Message scroll viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                      <Bot className="w-4.5 h-4.5 text-[#FFE600]" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-[24px] p-4 text-xs font-medium shadow-2xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#FFE600] text-slate-950 font-bold rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <div className="space-y-1">
                        {formatText(msg.text)}
                      </div>
                    )}
                    <span className={`text-[8px] block mt-1.5 text-right font-black tracking-wider uppercase font-mono ${
                      msg.role === 'user' ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-slate-950 shrink-0 shadow-sm mt-1 uppercase font-black text-[10px]">
                      {user ? <User className="w-4.5 h-4.5" /> : 'U'}
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
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-white shrink-0 animate-spin">
                  <RefreshCw className="w-4 h-4 text-[#FFE600]" />
                </div>
                <div className="bg-white border border-slate-200 rounded-[24px] rounded-tl-none p-4 text-xs shadow-2xs flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-650 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 bg-slate-650 rounded-full animate-bounce delay-250" />
                    <span className="w-1.5 h-1.5 bg-slate-650 rounded-full animate-bounce delay-400" />
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
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }} 
            className="p-4 border-t border-slate-200 bg-white flex gap-3 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask the budget coach about bento split-buying savings, smart swaps..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-bold text-slate-805"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-[#FFE600] hover:bg-yellow-400 text-black rounded-full shrink-0 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Action Prompt Chips Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Quick-actions section */}
          <div className="bg-sky-50/50 border border-sky-100 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-sky-900 uppercase tracking-widest flex items-center gap-2">
              <Gift className="w-4 h-4 text-sky-600" />
              Quick Budget Guides
            </h3>
            <p className="text-[11px] text-sky-700 leading-relaxed font-bold">
              Tap any saving chip below to query the chuse. Saving Wizard instantly for detailed calculations:
            </p>

            <div className="flex flex-col gap-2.5">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-2xl bg-white border border-sky-150 hover:bg-white hover:border-[#FFE600] hover:ring-2 hover:ring-yellow-450/10 transition-all text-[11px] font-black text-slate-800 flex items-center justify-between group cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <span className="truncate pr-2">{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Current basket info box */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFE600]/5 rounded-full blur-2xl" />
            
            <h3 className="text-xs font-black text-[#FFE600] uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Active Shopping Context
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Items in Basket:</span>
                <span className="font-extrabold">{basketDetails.length} items</span>
              </div>

              {basketDetails.length > 0 ? (
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 no-scrollbar pt-1">
                  {basketDetails.map((item, idx) => {
                    if (!item) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-850 p-2 rounded-xl border border-slate-800 text-[10px]">
                        <span className="truncate font-black">{item.name}</span>
                        <span className="font-mono text-[9px] text-[#FFE600] px-1.5 py-0.5 rounded-md bg-white/5 font-bold shrink-0 ml-1.5">
                          {item.quantity}x {item.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic leading-relaxed">
                  Your comparing bento doesn't have products registered. Add items from the catalog or seek generic tips from the Wizard!
                </p>
              )}
            </div>
            
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-[#FFE600] bg-white/10 px-2.5 py-1 rounded-full tracking-wider">
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
