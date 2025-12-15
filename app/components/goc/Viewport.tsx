"use client";

export default function Viewport() {
  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 p-4">
       <h2 className="text-xl font-bold mb-4 text-emerald-400">Viewport</h2>
       <div className="flex-1 bg-black rounded border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
          <div className="text-zinc-600 text-center">
            <p className="mb-2 font-bold">MEDIA LINK OFFLINE</p>
            <p className="text-xs">Awaiting Phase 2 Agora Integration</p>
          </div>
          
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/10 to-transparent opacity-20 pointer-events-none animate-scan"></div>
       </div>

       <div className="mt-4 grid grid-cols-2 gap-2">
         <button 
           onClick={() => alert("Screen Share is scheduled for Phase 2.")}
           className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-sm transition-colors"
         >
           Share Screen
         </button>
         <button 
           onClick={() => alert("Voice Comms is scheduled for Phase 2.")}
           className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-sm transition-colors"
         >
           Join Voice
         </button>
       </div>
    </div>
  );
}
