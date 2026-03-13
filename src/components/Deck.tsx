import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Zap, Mic, Drum, Music2, Layers, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '../constants';
import { analyzeTrack, TrackAnalysis, getLyrics, getStemAdvice } from '../services/geminiService';

interface DeckProps {
  id: 'A' | 'B';
  track: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number;
  pitch: number;
  onPitchChange: (val: number) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onBpmDetected?: (bpm: number) => void;
  stems: { vocals: number; drums: number; bass: number; other: number };
  onStemsChange: (param: 'vocals' | 'drums' | 'bass' | 'other', val: number) => void;
  isSandbox?: boolean;
  onToggleSandbox?: () => void;
}

export const Deck: React.FC<DeckProps> = ({
  id,
  track,
  isPlaying,
  onTogglePlay,
  volume,
  pitch,
  onPitchChange,
  currentTime,
  duration,
  onSeek,
  onBpmDetected,
  stems,
  onStemsChange,
  isSandbox,
  onToggleSandbox
}) => {
  const [analysis, setAnalysis] = useState<TrackAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isGettingLyrics, setIsGettingLyrics] = useState(false);
  
  // Stems Solo/Mute state (local to deck for quick toggling)
  const [stemStates, setStemStates] = useState({
    vocals: true,
    drums: true,
    bass: true,
    other: true
  });

  const [stemAdvice, setStemAdvice] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [hotCues, setHotCues] = useState<(number | null)[]>([null, null, null, null]);
  const [padMode, setPadMode] = useState<'HOTCUE' | 'SAMPLER' | 'STEMS' | 'SLICER' | 'SCRATCH'>('HOTCUE');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [jogRotation, setJogRotation] = useState(0);
  const jogRef = useRef<HTMLDivElement>(null);
  const lastJogAngle = useRef(0);

  useEffect(() => {
    if (isPlaying && !isScratching) {
      const interval = setInterval(() => {
        setJogRotation(prev => (prev + 2) % 360);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [isPlaying, isScratching]);

  const handleJogStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsScratching(true);
    const rect = jogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastJogAngle.current = Math.atan2(clientY - centerY, clientX - centerX);
  };

  const handleJogMove = (e: MouseEvent | TouchEvent) => {
    if (!isScratching) return;
    const rect = jogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentAngle = Math.atan2(clientY - centerY, clientX - centerX);
    let delta = currentAngle - lastJogAngle.current;
    
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    const deltaDegrees = (delta * 180) / Math.PI;
    setJogRotation(prev => (prev + deltaDegrees) % 360);
    
    // Scratching effect: seek track based on rotation delta
    // 360 degrees = 2 seconds of audio (approx)
    const seekDelta = (deltaDegrees / 360) * 2;
    onSeek(Math.max(0, Math.min(duration, currentTime + seekDelta)));
    
    lastJogAngle.current = currentAngle;
  };

  const handleJogEnd = () => {
    setIsScratching(false);
  };

  const SCRATCH_DNA_PATTERNS = [
    { name: 'BABY', icon: '👶', moves: [{ d: 40, t: 120 }, { d: -40, t: 120 }] },
    { name: 'CUTTER', icon: '✂️', moves: [{ d: 80, t: 180 }, { d: -80, t: 60 }] },
    { name: 'CHIRP', icon: '🐤', moves: [{ d: 50, t: 90 }, { d: -50, t: 90 }] },
    { name: 'FLARE', icon: '🔥', moves: [{ d: 100, t: 220 }, { d: -50, t: 110 }, { d: 50, t: 110 }, { d: -100, t: 220 }] },
  ];

  const triggerScratchDNA = async (pattern: typeof SCRATCH_DNA_PATTERNS[0]) => {
    if (isScratching || !track) return;
    setIsScratching(true);
    
    // Store initial state to return to
    const initialAudioTime = currentTime;

    for (const move of pattern.moves) {
      const startTime = Date.now();
      const startRotation = jogRotation;
      const startAudioTime = currentTime;
      
      await new Promise(resolve => {
        const animate = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / move.t, 1);
          
          // Use easeInOutQuad for smoother scratching
          const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const currentDelta = move.d * easeProgress;
          setJogRotation((startRotation + currentDelta) % 360);
          
          const seekDelta = (currentDelta / 360) * 2;
          onSeek(Math.max(0, Math.min(duration, startAudioTime + seekDelta)));
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve(null);
          }
        };
        requestAnimationFrame(animate);
      });
    }
    
    setIsScratching(false);
  };

  useEffect(() => {
    if (isScratching) {
      window.addEventListener('mousemove', handleJogMove);
      window.addEventListener('mouseup', handleJogEnd);
      window.addEventListener('touchmove', handleJogMove);
      window.addEventListener('touchend', handleJogEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleJogMove);
      window.removeEventListener('mouseup', handleJogEnd);
      window.removeEventListener('touchmove', handleJogMove);
      window.removeEventListener('touchend', handleJogEnd);
    };
  }, [isScratching]);

  useEffect(() => {
    if (track) {
      handleAnalyze();
      setLyrics(null);
      setShowLyrics(false);
      setHotCues([null, null, null, null]);
      // Generate stable waveform data
      const data = Array.from({ length: 80 }).map(() => Math.random() * 80 + 20);
      setWaveformData(data);
    } else {
      setWaveformData([]);
    }
  }, [track]);

  const handleAnalyze = async () => {
    if (!track) return;
    setIsAnalyzing(true);
    const result = await analyzeTrack(track.title, track.artist);
    setAnalysis(result);
    if (onBpmDetected) onBpmDetected(result.bpm);
    setIsAnalyzing(false);
  };

  const handleToggleLyrics = async () => {
    if (!track) return;
    if (!lyrics) {
      setIsGettingLyrics(true);
      const result = await getLyrics(track.title, track.artist);
      setLyrics(result);
      setIsGettingLyrics(false);
    }
    setShowLyrics(!showLyrics);
  };

  const toggleStem = async (type: keyof typeof stemStates) => {
    const newState = { ...stemStates, [type]: !stemStates[type] };
    setStemStates(newState);
    
    if (!newState[type] && track) {
      const advice = await getStemAdvice(track.title, type as string);
      setStemAdvice(advice);
      setTimeout(() => setStemAdvice(null), 5000);
    }
  };

  const isolateStem = (type: keyof typeof stemStates) => {
    const isAlreadyIsolated = stemStates[type] && Object.entries(stemStates).every(([key, val]) => key === type || !val);
    
    if (isAlreadyIsolated) {
      // Reset to all on
      setStemStates({ vocals: true, drums: true, bass: true, other: true });
    } else {
      // Solo this one
      setStemStates({ vocals: false, drums: false, bass: false, other: false, [type]: true });
    }
  };

  const handleHotCue = (index: number) => {
    if (!track) return;
    
    if (hotCues[index] === null) {
      const newCues = [...hotCues];
      newCues[index] = currentTime;
      setHotCues(newCues);
    } else {
      onSeek(hotCues[index]!);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-dj-card rounded-2xl p-6 border border-dj-border flex flex-col gap-6 shadow-2xl relative overflow-hidden">
      {/* Deck Header */}
      <div className="flex justify-between items-start z-10">
        <div className="flex gap-4 items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${id === 'A' ? 'bg-dj-accent text-black' : 'bg-dj-accent-secondary text-white'}`}>
            {id}
          </div>
          <div>
            <h2 className="text-xl font-bold truncate max-w-[200px]">{track?.title || 'No Track Loaded'}</h2>
            <p className="text-sm text-white/50">{track?.artist || 'Select a track from library'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={onToggleSandbox}
              className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${isSandbox ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isSandbox ? 'bg-orange-500 animate-pulse' : 'bg-white/20'}`} />
              SANDBOX
            </button>
            <div className="text-2xl font-mono text-dj-accent">{formatTime(currentTime)}</div>
          </div>
          <div className="text-xs text-white/30 font-mono">-{formatTime(duration - currentTime)}</div>
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="waveform-container group z-10 h-32 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
           <Zap size={64} className={isPlaying ? 'animate-pulse' : ''} />
        </div>
        
        {/* Waveform Visualization */}
        <div className="absolute inset-0 flex items-center gap-[2px] px-2">
          {waveformData.length > 0 ? (
            waveformData.map((height, i) => {
              const progress = (currentTime / duration) || 0;
              const isActive = (i / waveformData.length) < progress;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-center gap-[1px] h-full">
                  <motion.div 
                    animate={{ 
                      height: isPlaying ? [`${height/2}%`, `${height/2 + 5}%`, `${height/2}%`] : `${height/2}%` 
                    }}
                    transition={{ 
                      duration: 0.5, 
                      repeat: Infinity, 
                      delay: i * 0.01 
                    }}
                    className={`w-full rounded-t-full transition-colors duration-300 ${isActive ? (id === 'A' ? 'bg-dj-accent shadow-[0_0_8px_rgba(0,255,255,0.5)]' : 'bg-dj-accent-secondary shadow-[0_0_8px_rgba(255,0,255,0.5)]') : 'bg-white/10'}`}
                  />
                  <motion.div 
                    animate={{ 
                      height: isPlaying ? [`${height/3}%`, `${height/3 + 3}%`, `${height/3}%`] : `${height/3}%` 
                    }}
                    transition={{ 
                      duration: 0.5, 
                      repeat: Infinity, 
                      delay: i * 0.01 
                    }}
                    className={`w-full rounded-b-full transition-colors duration-300 opacity-50 ${isActive ? (id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary') : 'bg-white/5'}`}
                  />
                </div>
              );
            })
          ) : (
            <div className="w-full flex items-center justify-center text-[10px] text-white/10 uppercase tracking-widest">
              Waiting for track...
            </div>
          )}
        </div>

        {/* Playhead Line */}
        {duration > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_10px_white]"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}

        {/* Hot Cue Markers */}
        {hotCues.map((cue, i) => cue !== null && (
          <div 
            key={i}
            className={`absolute top-0 bottom-0 w-1 z-20 shadow-[0_0_5px_rgba(255,255,255,0.5)] flex flex-col items-center`}
            style={{ left: `${(cue / duration) * 100}%` }}
          >
            <div className={`w-3 h-3 -mt-1 rounded-full ${id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary'} flex items-center justify-center text-[8px] font-bold text-black`}>
              {i + 1}
            </div>
            <div className={`flex-1 w-[1px] ${id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary'} opacity-50`} />
          </div>
        ))}

        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={currentTime} 
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
        />
        
        {/* Lyrics Overlay */}
        <AnimatePresence>
          {showLyrics && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <div className="text-xs font-bold text-dj-accent uppercase tracking-widest mb-2">AI Lyrics</div>
              <div className="text-sm italic text-white/90 leading-relaxed whitespace-pre-line">
                {lyrics}
              </div>
              <button 
                onClick={() => setShowLyrics(false)}
                className="mt-4 text-[10px] text-white/40 hover:text-white uppercase"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-12 gap-6 z-10">
        {/* Left Column: Transport & Pads */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex gap-2">
            <button className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <SkipBack size={20} />
            </button>
            <button 
              onClick={onTogglePlay}
              className={`flex-1 py-3 rounded-lg flex items-center justify-center transition-all ${isPlaying ? 'bg-white/10 text-white' : 'bg-dj-accent text-black font-bold'}`}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <SkipForward size={20} />
            </button>
          </div>
          
          {/* Performance Pads */}
          <div className="flex flex-col gap-2">
            <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Hot Cues</div>
            <div className="grid grid-cols-4 gap-2">
              {hotCues.map((cue, i) => (
                <button 
                  key={i} 
                  onClick={() => handleHotCue(i)}
                  className={`aspect-square rounded border transition-all text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
                    cue !== null 
                      ? (id === 'A' ? 'bg-dj-accent/20 border-dj-accent text-dj-accent shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'bg-dj-accent-secondary/20 border-dj-accent-secondary text-dj-accent-secondary shadow-[0_0_10px_rgba(255,0,255,0.2)]')
                      : 'bg-white/5 border-white/10 text-white/20 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[8px] opacity-50">{i + 1}</span>
                  {cue !== null ? formatTime(cue) : 'SET'}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-2 mt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <button 
                  key={i + 4} 
                  className="aspect-square rounded bg-white/5 border border-white/10 hover:bg-dj-accent/20 hover:border-dj-accent/50 transition-all text-[10px] font-bold flex items-center justify-center text-white/20"
                >
                  {i + 5}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Jog Wheel & Pitch */}
        <div className="col-span-4 flex flex-col items-center gap-4">
          <div className="relative group">
            {/* Jog Wheel */}
            <div 
              ref={jogRef}
              onMouseDown={handleJogStart}
              onTouchStart={handleJogStart}
              className="relative w-48 h-48 rounded-full bg-zinc-900 border-[12px] border-black shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden"
              style={{ transform: `rotate(${jogRotation}deg)` }}
            >
              {/* Vinyl Grooves */}
              <div className="absolute inset-0 rounded-full" style={{ background: 'repeating-radial-gradient(circle, #222, #222 2px, #111 4px)' }} />
              
              {/* Center Label */}
              <div className={`absolute inset-[35%] rounded-full ${id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary'} flex items-center justify-center shadow-inner border-4 border-black/20`}>
                <div className="w-2 h-2 rounded-full bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-[8px] font-black text-black/60 uppercase tracking-tighter">{track?.artist || 'DJ'}</span>
                </div>
              </div>

              {/* Marker for rotation visibility */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-10 bg-white/60 rounded-full mt-1 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              
              {/* Reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            </div>

            {/* Outer Ring Glow */}
            <div className={`absolute -inset-2 rounded-full border-2 transition-all duration-300 ${isScratching ? 'border-white opacity-40 scale-105' : (id === 'A' ? 'border-dj-accent/20' : 'border-dj-accent-secondary/20')}`} />
          </div>

          <div className="flex flex-col items-center justify-center gap-1 w-full">
            <div className="text-2xl font-bold font-mono text-dj-accent">
              {analysis ? Math.round(analysis.bpm * (1 + pitch / 100)) : '---'}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-tighter">BPM</div>
            <div className="flex items-center gap-2 w-full px-4">
              <span className="text-[8px] text-white/20 font-bold">-16%</span>
              <input 
                type="range" 
                min="-16" 
                max="16" 
                step="0.1"
                value={pitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className="flex-1 accent-dj-accent h-1"
              />
              <span className="text-[8px] text-white/20 font-bold">+16%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Pads & AI */}
        <div className="col-span-4 flex flex-col gap-4">
          {/* Performance Pads Section */}
          <div className="bg-black/40 rounded-xl p-3 border border-white/10 shadow-inner">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex gap-2">
                {['HOTCUE', 'SAMPLER', 'STEMS', 'SCRATCH'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPadMode(mode as any)}
                    className={`text-[8px] font-black px-2 py-0.5 rounded transition-all ${padMode === mode ? 'bg-dj-accent text-black' : 'text-white/30 hover:text-white'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {padMode === 'STEMS' ? (
                [
                  { id: 'vocals', label: 'VOCALS', icon: <Mic size={16} />, color: 'purple' },
                  { id: 'drums', label: 'DRUMS', icon: <Drum size={16} />, color: 'blue' },
                  { id: 'bass', label: 'BASS', icon: <Music2 size={16} />, color: 'green' },
                  { id: 'other', label: 'INST', icon: <Layers size={16} />, color: 'orange' }
                ].map((stem) => (
                  <div key={stem.id} className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => isolateStem(stem.id as any)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all relative group overflow-hidden border-2 ${
                        stemStates[stem.id as keyof typeof stemStates] 
                          ? `bg-${stem.color}-500/20 border-${stem.color}-500/50 text-${stem.color}-400 shadow-[0_0_15px_rgba(0,0,0,0.3)]` 
                          : 'bg-black/60 border-white/5 text-white/10 grayscale'
                      }`}
                    >
                      {stemStates[stem.id as keyof typeof stemStates] && (
                        <div className={`absolute inset-0 bg-${stem.color}-500/10 animate-pulse`} />
                      )}
                      <div className="z-10">{stem.icon}</div>
                      <span className="text-[8px] font-black z-10">{stem.label}</span>
                    </button>
                    <button 
                      onClick={() => toggleStem(stem.id as any)}
                      className={`py-1 rounded text-[6px] font-bold uppercase transition-all border ${
                        stemStates[stem.id as keyof typeof stemStates] 
                          ? 'bg-white/5 text-white/40 border-white/10' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {stemStates[stem.id as keyof typeof stemStates] ? 'MUTE' : 'CUT'}
                    </button>
                  </div>
                ))
              ) : padMode === 'SAMPLER' ? (
                [1, 2, 3, 4].map((i) => (
                  <button 
                    key={i}
                    className="aspect-square rounded-lg bg-black/60 border-2 border-white/5 flex flex-col items-center justify-center gap-1 hover:border-orange-500/50 transition-all group"
                  >
                    <div className="w-2 h-2 rounded-full bg-orange-500/20 group-hover:bg-orange-500 animate-pulse" />
                    <span className="text-[8px] font-black text-white/40 group-hover:text-white">SMPL {i}</span>
                  </button>
                ))
              ) : padMode === 'SCRATCH' ? (
                SCRATCH_DNA_PATTERNS.map((pattern) => (
                  <button 
                    key={pattern.name}
                    onClick={() => triggerScratchDNA(pattern)}
                    className="aspect-square rounded-lg bg-black/60 border-2 border-white/5 flex flex-col items-center justify-center gap-1 hover:border-dj-accent hover:bg-dj-accent/10 transition-all group relative overflow-hidden"
                  >
                    <div className="text-lg group-hover:scale-125 transition-transform">{pattern.icon}</div>
                    <span className="text-[8px] font-black text-white/40 group-hover:text-dj-accent">{pattern.name}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-dj-accent/20 group-hover:bg-dj-accent transition-all" />
                  </button>
                ))
              ) : (
                hotCues.map((cue, i) => (
                  <button 
                    key={i}
                    onClick={() => handleHotCue(i)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all relative group overflow-hidden border-2 ${
                      cue !== null 
                        ? 'bg-dj-accent/20 border-dj-accent/50 text-dj-accent shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
                        : 'bg-black/60 border-white/5 text-white/20 hover:border-white/20'
                    }`}
                  >
                    <div className="z-10 text-[10px] font-black">{i + 1}</div>
                    <span className="text-[7px] font-bold z-10 uppercase tracking-tighter">
                      {cue !== null ? formatTime(cue) : 'EMPTY'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 text-dj-accent">
              <Zap size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">AI Insight</span>
            </div>
            {isAnalyzing ? (
              <div className="flex-1 flex items-center justify-center">
                 <div className="w-4 h-4 border-2 border-dj-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : analysis ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40">KEY</span>
                  <span className="text-xs font-mono text-dj-accent">{analysis.key}</span>
                </div>
                <div className="text-[10px] text-white/60 italic line-clamp-2 leading-tight">
                  {stemAdvice || analysis.transitionAdvice}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[10px] text-white/20 text-center">
                Load track
              </div>
            )}
          </div>

          <button 
            onClick={handleToggleLyrics}
            disabled={!track || isGettingLyrics}
            className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all border ${showLyrics ? 'bg-dj-accent text-black border-dj-accent' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            {isGettingLyrics ? (
              <div className="w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <AlignLeft size={14} />
                {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Background Glow */}
      <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none ${id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary'}`} />
    </div>
  );
};
