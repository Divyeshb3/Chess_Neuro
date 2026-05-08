import React from 'react';
import { motion } from 'motion/react';
import { Users, Cpu, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface MenuProps {
  onStart: (mode: 'single' | 'multi') => void;
}

export const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = React.useState<'single' | 'multi' | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-400 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block p-4 bg-white rounded-3xl shadow-xl mb-6"
          >
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              ♘
            </div>
          </motion.div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-3">NEURO-CHESS</h1>
          <p className="text-slate-500 font-medium tracking-wide border-y border-slate-200 py-2 inline-block">THE NEXT GENERATION OF STRATEGY</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <button
            onClick={() => setSelectedMode('single')}
            className={cn(
              "group p-8 bg-white rounded-[32px] border-2 transition-all duration-300 text-left hover:shadow-2xl",
              selectedMode === 'single' ? "border-indigo-600 ring-4 ring-indigo-50" : "border-slate-100"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors",
              selectedMode === 'single' ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
            )}>
              <Cpu size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Player vs AI</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Challenge our Gemini-powered Grandmaster engine in a deep tactical battle.</p>
          </button>

          <button
            onClick={() => setSelectedMode('multi')}
            className={cn(
              "group p-8 bg-white rounded-[32px] border-2 transition-all duration-300 text-left hover:shadow-2xl",
              selectedMode === 'multi' ? "border-indigo-600 ring-4 ring-indigo-50" : "border-slate-100"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors",
              selectedMode === 'multi' ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
            )}>
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Player vs Player</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Join a neural link room to compete against human opponents in real-time.</p>
          </button>
        </div>

        <motion.button
          disabled={!selectedMode}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => selectedMode && onStart(selectedMode)}
          className={cn(
            "w-full p-6 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 transition-all",
            selectedMode 
              ? "bg-slate-900 text-white shadow-xl hover:bg-slate-800" 
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          START TRANSMISSION
          <ChevronRight size={20} />
        </motion.button>
      </motion.div>
    </div>
  );
};
