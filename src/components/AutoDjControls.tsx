import React, { useState } from 'react';
import { Play, Square, Settings2, Sparkles, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AutoDjControlsProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  mood: string;
  onMoodChange: (mood: string) => void;
  nextTrackReason?: string;
}

export const AutoDjControls: React.FC<AutoDjControlsProps> = ({
  isActive,
  onToggle,
  mood,
  onMoodChange,
  nextTrackReason
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const moods = [
    { id: 'energetic', label: 'High Energy', color: 'bg-orange-500' },
    { id: 'chill', label: 'Chill & Relaxed', color: 'bg-blue-500' },
    { id: 'dark', label: 'Dark & Moody', color: 'bg-purple-500' },
    { id: 'uplifting', label: 'Uplifting', color: 'bg-yellow-500' }
  ];

  return (
    <div className="bg-dj-card rounded-2xl p-4 border border-dj-border flex flex-col gap-4 shadow-xl">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-dj-accent text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'bg-white/5 text-white/40'}`}>
            <Sparkles size={20} className={isActive ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Auto-DJ Mode</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">AI-Powered Mixing</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-all ${showSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/40 hover:text-white'}`}
          >
            <Settings2 size={18} />
          </button>
          <button 
            onClick={() => onToggle(!isActive)}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${isActive ? 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-dj-accent text-black hover:bg-dj-accent/80'}`}
          >
            {isActive ? (
              <>
                <Square size={14} fill="currentColor" />
                Stop
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 pt-4"
          >
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">Target Mood</div>
            <div className="grid grid-cols-2 gap-2">
              {moods.map(m => (
                <button
                  key={m.id}
                  onClick={() => onMoodChange(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${mood === m.id ? 'border-white/20 bg-white/5' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                  <div className={`text-[10px] font-bold ${mood === m.id ? 'text-white' : 'text-white/40'}`}>{m.label}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && (
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-dj-accent/10 flex items-center justify-center text-dj-accent">
              <Info size={16} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">AI Strategy</div>
              <p className="text-[11px] text-white/80 italic leading-relaxed">
                {nextTrackReason || "Analyzing library for the perfect transition..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
