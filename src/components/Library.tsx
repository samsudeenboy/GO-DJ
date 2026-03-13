import React, { useState } from 'react';
import { Music, Plus, Search, Globe, Library as LibraryIcon, Cloud, Youtube, Sparkles } from 'lucide-react';
import { Track, SAMPLE_TRACKS } from '../constants';
import { MusicGenerator } from './MusicGenerator';

interface LibraryProps {
  onLoadTrack: (track: Track, deck: 'A' | 'B') => void;
}

export const Library: React.FC<LibraryProps> = ({ onLoadTrack }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'streaming' | 'generator'>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'audio' | 'video' | 'karaoke'>('all');

  const filteredTracks = SAMPLE_TRACKS.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`transition-all duration-500 ease-in-out ${isCollapsed ? 'h-12' : 'h-80'} bg-dj-card border-t border-dj-border p-4 flex flex-col gap-4 z-20 relative`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -top-4 left-1/2 -translate-x-1/2 bg-dj-card border border-dj-border rounded-full p-1 text-white/40 hover:text-dj-accent transition-colors z-30"
      >
        <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
          <Plus size={16} className="rotate-45" />
        </div>
      </button>

      <div className="flex justify-between items-center min-h-[32px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/60 mr-4">
            <LibraryIcon size={16} className="text-dj-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Music Library</span>
          </div>
          {!isCollapsed && (
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 animate-in fade-in slide-in-from-left-2 duration-300">
              <button 
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'local' ? 'bg-dj-accent text-black' : 'text-white/40 hover:text-white'}`}
              >
                <LibraryIcon size={14} />
                Local
              </button>
              <button 
                onClick={() => setActiveTab('streaming')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'streaming' ? 'bg-blue-500 text-white' : 'text-white/40 hover:text-white'}`}
              >
                <Cloud size={14} />
                Streaming
              </button>
              <button 
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'generator' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-white/40 hover:text-white'}`}
              >
                <Sparkles size={14} />
                AI Toolkit
              </button>
            </div>
          )}
        </div>
        
        {!isCollapsed && activeTab !== 'generator' && (
          <div className="relative animate-in fade-in duration-300">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input 
              type="text" 
              placeholder="Search tracks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-dj-accent transition-colors w-64"
            />
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-x-auto flex gap-4 pb-2 scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === 'local' ? (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-2">
              {['all', 'audio', 'video', 'karaoke'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as any)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border ${activeCategory === cat ? 'bg-dj-accent text-black border-dj-accent' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {filteredTracks.map(track => (
              <div 
                key={track.id}
                className="flex-shrink-0 w-72 bg-black/20 rounded-xl p-3 border border-white/5 hover:border-white/20 transition-all group flex gap-4 items-center"
              >
                <img 
                  src={track.cover} 
                  alt={track.title} 
                  className="w-20 h-20 rounded-lg object-cover shadow-lg group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{track.title}</h4>
                  <p className="text-[10px] text-white/40 truncate mb-3">{track.artist}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onLoadTrack(track, 'A')}
                      className="flex-1 py-1.5 rounded bg-dj-accent/10 hover:bg-dj-accent text-dj-accent hover:text-black text-[9px] font-bold transition-all border border-dj-accent/20"
                    >
                      DECK A
                    </button>
                    <button 
                      onClick={() => onLoadTrack(track, 'B')}
                      className="flex-1 py-1.5 rounded bg-dj-accent-secondary/10 hover:bg-dj-accent-secondary text-dj-accent-secondary hover:text-white text-[9px] font-bold transition-all border border-dj-accent-secondary/20"
                    >
                      DECK B
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex-shrink-0 w-40 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-white/20 transition-all cursor-pointer text-white/20 hover:text-white/40">
              <Plus size={24} />
              <span className="text-[10px] font-bold uppercase">Import Track</span>
            </div>
            </div>
          </div>
        ) : activeTab === 'streaming' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 border border-dashed border-white/5 rounded-2xl p-6">
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <Cloud size={24} />
                </div>
                <span className="text-[8px] font-bold uppercase">SoundCloud</span>
              </div>
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">
                  <Youtube size={24} />
                </div>
                <span className="text-[8px] font-bold uppercase">YouTube</span>
              </div>
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Globe size={24} />
                </div>
                <span className="text-[8px] font-bold uppercase">Beatport</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Streaming Integration Active</p>
              <p className="text-[10px] text-white/30">Select a provider to browse your playlists</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <MusicGenerator onLoadTrack={onLoadTrack} />
          </div>
        )}
      </div>
      )}
    </div>
  );
};
