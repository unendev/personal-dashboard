"use client";

import { useState, useRef, useEffect } from "react";
import { useStorage, useMutation, useSelf, useOthers, useEventListener } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import { Shield, HelpCircle, ClipboardList, Bot, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";

type AIMode = 'advisor' | 'interrogator' | 'planner';

// Define the message structure, consistent with Liveblocks storage
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  userName?: string;
  userColor?: string;
}

export default function CommandCenter() {
  const notes = useStorage((root) => root.notes);
  const storedMessages = useStorage((root) => root.messages) || [];
  const me = useSelf();
  const others = useOthers();

  const [aiMode, setAiMode] = useState<AIMode>('advisor');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-chat');
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State for the message currently being streamed
  const [liveStreamingMessage, setLiveStreamingMessage] = useState<Message | null>(null);

  // --- Liveblocks Mutations & Hooks ---
  const addMessage = useMutation(({ storage }, msg: Message) => {
    storage.get("messages")?.push(msg);
  }, []);

  // Note: tool-related mutations (updateSharedNotes, addTodo) are kept for future use
  // but are not called since tool-calling is temporarily disabled for stability.

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userContent = input;
    setInput("");

    const messageId = crypto.randomUUID();
    addMessage({ id: messageId, role: 'user', content: userContent, createdAt: Date.now(), userName: (me?.info?.name || "Operator") });

    const playerList = [{ id: me?.id, name: me?.info?.name }, ...others.map(u => ({ id: u.id, name: u.info?.name || "Unknown" }))];
    
    try {
      const response = await fetch('/api/goc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: storedMessages.map(m => ({ role: m.role, content: m.content })), // Send history
          notes, 
          players: playerList, 
          mode: aiMode, 
          model: selectedModel
        }),
      });
      
      if (!response.ok || !response.body) throw new Error('Network response was not ok.');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      const assistantMessageId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setLiveStreamingMessage({
          id: assistantMessageId, 
          role: 'assistant', 
          content: fullContent, 
          createdAt: Date.now(), 
          userName: 'NEXUS AI'
        });
      }
      
      if (fullContent) {
          addMessage({ id: assistantMessageId, role: 'assistant', content: fullContent, createdAt: Date.now(), userName: 'NEXUS AI' });
      }

    } catch (error) {
      console.error("Fetch stream error:", error);
      // Optionally, add an error message to the chat
    } finally {
      setLiveStreamingMessage(null); // Clear streaming message
      setIsLoading(false);
    }
  };

  // --- Display Logic ---
  const displayMessages = liveStreamingMessage ? [...storedMessages, liveStreamingMessage] : storedMessages;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, liveStreamingMessage?.content]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] relative">
       {/* Header */}
       <div className="absolute top-0 left-0 w-full p-2 border-b border-zinc-800 z-10 bg-[#0a0a0a]/90 backdrop-blur flex flex-col gap-2">
         <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-bold text-cyan-400 tracking-widest">COMMAND CENTER</h2>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="deepseek-chat">DeepSeek V3</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-3.0-pro-preview">Gemini 3.0 Pro (Preview)</option>
            </select>
         </div>
         <div className="flex justify-center gap-2">
           <button onClick={() => setAiMode('advisor')} className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all border", aiMode === 'advisor' ? "bg-cyan-900/50 border-cyan-500 text-cyan-100" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600")}><Shield className="w-3 h-3" /> Advisor</button>
           <button onClick={() => setAiMode('interrogator')} className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all border", aiMode === 'interrogator' ? "bg-amber-900/50 border-amber-500 text-amber-100" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600")}><HelpCircle className="w-3 h-3" /> Interrogator</button>
           <button onClick={() => setAiMode('planner')} className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all border", aiMode === 'planner' ? "bg-emerald-900/50 border-emerald-500 text-emerald-100" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600")}><ClipboardList className="w-3 h-3" /> Planner</button>
         </div>
       </div>
 
       {/* Messages */}
       <div className="flex-1 overflow-y-auto p-4 pt-32 space-y-6 custom-scrollbar">
         {displayMessages.map((m: Message) => {
           const isAI = m.role === 'assistant';
           const isMyMessage = m.role === 'user' && m.userName === (me?.info?.name || "Operator");
           return (
             <div key={m.id} className={cn("flex w-full", isAI ? "justify-center" : isMyMessage ? "justify-end" : "justify-start")} >
               <div className={cn("relative max-w-[85%] p-4 rounded-xl text-sm border shadow-lg backdrop-blur-sm", isAI ? "bg-black/40 border-cyan-500/30 text-cyan-100 w-[90%] shadow-[0_0_15px_rgba(6,182,212,0.1)]" : isMyMessage ? "bg-zinc-800/80 border-zinc-700 text-zinc-100 rounded-br-none" : "bg-zinc-900/80 border-zinc-800 text-zinc-300 rounded-bl-none")} > 
                 <div className={cn("flex items-center gap-2 mb-2 text-[10px] uppercase font-bold tracking-wider opacity-70", isAI ? "justify-center text-cyan-400" : "justify-between")} >
                   {isAI && <Bot className="w-3 h-3" />}
                   <span>{m.userName || (isAI ? "NEXUS AI" : "OPERATOR")}</span>
                   {!isAI && m.createdAt && <span className="opacity-50 font-mono">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                 </div>
                 <div className="markdown-content">
                   <MarkdownView content={m.content} variant="goc" />
                 </div>
               </div>
             </div>
           );
         })}
         <div ref={messagesEndRef} />
       </div>
 
       {/* Input Form */}
       <div className="p-4 border-t border-zinc-800 bg-[#0a0a0a]">
         <form onSubmit={handleSubmit} className="flex gap-2 relative">
           <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Awaiting orders..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 pl-4 text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-600" disabled={isLoading} />
           <button type="submit" disabled={isLoading} className="bg-cyan-900 hover:bg-cyan-800 text-cyan-100 px-6 py-2 rounded font-bold transition-colors border border-cyan-700 disabled:opacity-50">
             {isLoading ? '...' : 'SEND'}
           </button>
         </form>
       </div>
    </div>
  );
}
