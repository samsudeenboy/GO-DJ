import React, { useState, useRef } from 'react';
import { Search, Plus, Music, Disc, Trash2, Upload, Play, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '../constants';

interface BrowserProps {
  onLoadTrack: (deckId: 'A' | 'B', track: Track) => void;
  currentTracks: { A: Track | null; B: Track | null };
}

export const Browser: React.FC<BrowserProps> = ({ onLoadTrack, currentTracks }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', title: 'Midnight City', artist: 'M83', duration: 243, bpm: 105, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: '2', title: 'Strobe', artist: 'deadmau5', duration: 632, bpm: 128, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: '3', title: 'Levels', artist: 'Avicii', duration: 199, bpm: 126, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: '4', title: 'One More Time', artist: 'Daft Punk', duration: 320, bpm: 123, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  ]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const url = URL.createObjectURL(file);
      const newTrack: Track = {
        id: Math.random().toString(36).substr(2, 9),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local Upload',
        duration: 0, // Will be updated when loaded
        bpm: 120,
        url: url
      };
      setTracks(prev => [newTrack, ...prev]);
    });
  };

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-dj-card rounded-[2rem] border border-dj-border p-6 flex flex-col gap-6 shadow-2xl h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dj-accent/10 border border-dj-accent flex items-center justify-center text-dj-accent">
            <Disc size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Track Library</h3>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-tighter">{tracks.length} Tracks Available</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input 
              type="text"
              placeholder="SEARCH CRATE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-full py-2 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-dj-accent/50 transition-all w-48"
            />
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-dj-accent text-black hover:scale-105 transition-transform shadow-lg shadow-dj-accent/20"
          >
            <Plus size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="audio/*" 
            className="hidden" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {filteredTracks.map((track) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={track.id}
              className="group bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center relative overflow-hidden">
                  <Music size={20} className="text-white/20 group-hover:text-dj-accent transition-colors" />
                  { (currentTracks.A?.id === track.id || currentTracks.B?.id === track.id) && (
                    <div className="absolute inset-0 bg-dj-accent/20 flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-dj-accent shadow-glow" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white/80 uppercase tracking-tight">{track.title}</h4>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{track.artist}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onLoadTrack('A', track)}
                  className="px-4 py-2 rounded-lg bg-dj-accent/10 border border-dj-accent text-dj-accent text-[9px] font-black uppercase tracking-widest hover:bg-dj-accent hover:text-black transition-all"
                >
                  LOAD A
                </button>
                <button 
                  onClick={() => onLoadTrack('B', track)}
                  className="px-4 py-2 rounded-lg bg-dj-accent-secondary/10 border border-dj-accent-secondary text-dj-accent-secondary text-[9px] font-black uppercase tracking-widest hover:bg-dj-accent-secondary hover:text-white transition-all"
                >
                  LOAD B
                </button>
                <button 
                  onClick={() => setTracks(prev => prev.filter(t => t.id !== track.id))}
                  className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredTracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
            <Upload size={48} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">No tracks found in crate</p>
          </div>
        )}
      </div>
    </div>
  );
};
