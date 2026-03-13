import React, { useState } from 'react';
import { Sparkles, Music, Play, Plus, Loader2, Wand2 } from 'lucide-react';
import { generateMusicMetadata, GeneratedTrack } from '../services/geminiService';
import { Track } from '../constants';

interface MusicGeneratorProps {
  onLoadTrack: (track: Track, deck: 'A' | 'B') => void;
}

export const MusicGenerator: React.FC<MusicGeneratorProps> = ({ onLoadTrack }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<GeneratedTrack | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const result = await generateMusicMetadata(prompt);
    setGeneratedTrack(result);
    setIsGenerating(false);
  };

  const handleLoadToDeck = (deck: 'A' | 'B') => {
    if (!generatedTrack) return;
    
    const track: Track = {
      id: Date.now().toString(),
      title: generatedTrack.title,
      artist: generatedTrack.artist,
      cover: `https://picsum.photos/seed/${generatedTrack.title}/400/400`,
      duration: 180,
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
    };
    
    onLoadTrack(track, deck);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-6 bg-black/40 rounded-2xl border border-white/5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-dj-accent/20 flex items-center justify-center text-dj-accent">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">AI Music Generation Toolkit</h3>
          <p className="text-xs text-white/40">Create studio-quality tracks in seconds</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <textarea
          placeholder="Describe your ideal sound, mood, or use case (e.g., 'A high-energy techno track with dark synths and a 128 BPM driving beat')..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-24 bg-black/60 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-dj-accent transition-all resize-none scrollbar-hide"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-3 rounded-xl bg-dj-accent text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-dj-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Generating Magic...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Generate Perfect Song
            </>
          )}
        </button>
      </div>

      {generatedTrack && (
        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 relative group">
              <img 
                src={`https://picsum.photos/seed/${generatedTrack.title}/200/200`} 
                alt="Cover" 
                className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-60"
                referrerPolicy="no-referrer"
              />
              <Play size={24} className="relative z-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-dj-accent truncate">{generatedTrack.title}</h4>
                  <p className="text-xs text-white/60">{generatedTrack.artist}</p>
                </div>
                <div className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase text-white/40">
                  {generatedTrack.bpm} BPM
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-2 line-clamp-2 italic">"{generatedTrack.description}"</p>
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => handleLoadToDeck('A')}
                  className="flex-1 py-1.5 rounded bg-dj-accent/10 hover:bg-dj-accent text-dj-accent hover:text-black text-[9px] font-bold transition-all border border-dj-accent/20"
                >
                  LOAD TO DECK A
                </button>
                <button 
                  onClick={() => handleLoadToDeck('B')}
                  className="flex-1 py-1.5 rounded bg-dj-accent-secondary/10 hover:bg-dj-accent-secondary text-dj-accent-secondary hover:text-white text-[9px] font-bold transition-all border border-dj-accent-secondary/20"
                >
                  LOAD TO DECK B
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
