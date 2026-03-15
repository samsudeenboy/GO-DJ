import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Zap, Mic, Drum, Music2, Layers, AlignLeft, Activity } from 'lucide-react';
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
  const [padMode, setPadMode] = useState<'HOTCUE' | 'SAMPLER' | 'STEMS' | 'SLICER' | 'SCRATCH' | 'STUTTER'>('HOTCUE');
  const [isScratching, setIsScratching] = useState(false);
  const [jogRotation, setJogRotation] = useState(0);
  const jogRef = useRef<HTMLDivElement>(null);
  const lastJogAngle = useRef(0);

  // Level Meter Simulation
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setLevel(Math.random() * 0.5 + 0.3);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setLevel(0);
    }
  }, [isPlaying]);

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

  const [activeStutter, setActiveStutter] = useState<number | null>(null);
  const stutterInterval = useRef<number | null>(null);

  const handleStutter = (division: number) => {
    if (activeStutter === division) {
      if (stutterInterval.current) window.clearInterval(stutterInterval.current);
      stutterInterval.current = null;
      setActiveStutter(null);
      return;
    }

    if (stutterInterval.current) window.clearInterval(stutterInterval.current);
    
    setActiveStutter(division);
    const bpm = analysis?.bpm || 120;
    const beatDuration = 60 / bpm;
    const intervalTime = (beatDuration * division) * 1000;
    const startPos = currentTime;

    stutterInterval.current = window.setInterval(() => {
      onSeek(startPos);
    }, intervalTime);
  };

  useEffect(() => {
    return () => {
      if (stutterInterval.current) window.clearInterval(stutterInterval.current);
    };
  }, []);

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

  const handleSampler = (index: number) => {
    // Simulate triggering a sample
    console.log(`Triggering sample ${index + 1}`);
    // In a real app, this would play an Audio object
  };

  const handleScratch = (intensity: number) => {
    if (!isPlaying) return;
    const scratchAmount = intensity * 0.5;
    onSeek(Math.max(0, currentTime - scratchAmount));
    setTimeout(() => {
      onSeek(currentTime + scratchAmount);
    }, 50);
  };

  const handleSlicer = (sliceIndex: number) => {
    if (!track) return;
    const bpm = analysis?.bpm || 120;
    const beatDuration = 60 / bpm;
    const sliceTime = (beatDuration / 4) * sliceIndex;
    const currentBeatStart = Math.floor(currentTime / beatDuration) * beatDuration;
    onSeek(currentBeatStart + sliceTime);
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 bg-dj-card rounded-[2.5rem] p-8 border border-dj-border flex flex-col gap-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group/deck"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-dj-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Deck Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex gap-5 items-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl border-2 ${id === 'A' ? 'bg-dj-accent/10 border-dj-accent text-dj-accent shadow-dj-accent/20' : 'bg-dj-accent-secondary/10 border-dj-accent-secondary text-dj-accent-secondary shadow-dj-accent-secondary/20'}`}
          >
            {id}
          </motion.div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black truncate max-w-[250px] tracking-tight text-white/90 uppercase">{track?.title || 'No Track Loaded'}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/40 font-black uppercase tracking-widest">{track?.artist || 'Select a track'}</p>
              {analysis && (
                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-white/30 uppercase tracking-tighter">
                  {analysis.key} • {analysis.mood}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleSandbox}
              className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${isSandbox ? 'bg-orange-500 text-black border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-white/5 border-white/10 text-white/30 hover:text-white'}`}
            >
              <div className={`w-2 h-2 rounded-full ${isSandbox ? 'bg-black animate-pulse' : 'bg-white/20'}`} />
              SANDBOX
            </motion.button>
            <div className="flex flex-col items-end">
              <div className={`text-3xl font-black font-mono tracking-tighter leading-none ${id === 'A' ? 'text-dj-accent' : 'text-dj-accent-secondary'}`}>{formatTime(currentTime)}</div>
              <div className="text-[10px] text-white/20 font-black tracking-widest mt-1">-{formatTime(duration - currentTime)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="waveform-container group z-10 h-40 bg-black/80 rounded-3xl border border-white/5 relative overflow-hidden shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />
        
        {/* Level Meter Overlay */}
        <div className="absolute right-3 top-3 bottom-3 w-2 flex flex-col-reverse gap-1 z-30">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div 
              key={i}
              animate={{ 
                opacity: level > (i / 20) ? 1 : 0.1,
                backgroundColor: i > 17 ? '#ff0055' : i > 14 ? '#ff8c00' : (id === 'A' ? '#00ff9d' : '#ff0055'),
                scale: level > (i / 20) ? 1.1 : 1
              }}
              className="w-full flex-1 rounded-full shadow-sm"
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
           <Zap size={64} className={isPlaying ? 'animate-pulse' : ''} />
        </div>
        
        {/* Waveform Visualization */}
        <div className="absolute inset-0 flex items-center gap-[3px] px-10">
          {waveformData.length > 0 ? (
            waveformData.map((height, i) => {
              const progress = (currentTime / duration) || 0;
              const isActive = (i / waveformData.length) < progress;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-center gap-[2px] h-full">
                  <motion.div 
                    animate={{ 
                      height: isPlaying ? [`${height/1.8}%`, `${height/1.8 + 8}%`, `${height/1.8}%`] : `${height/1.8}%`,
                      opacity: isActive ? 1 : 0.3
                    }}
                    transition={{ 
                      duration: 0.4, 
                      repeat: Infinity, 
                      delay: i * 0.005 
                    }}
                    className={`w-full rounded-full transition-all duration-500 ${isActive ? (id === 'A' ? 'bg-dj-accent shadow-[0_0_12px_rgba(0,255,157,0.6)]' : 'bg-dj-accent-secondary shadow-[0_0_12px_rgba(255,0,85,0.6)]') : 'bg-white/10'}`}
                  />
                </div>
              );
            })
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-3">
              <Activity size={32} className="text-white/5 animate-pulse" />
              <div className="text-[10px] text-white/10 font-black uppercase tracking-[0.3em]">
                Awaiting Audio Signal
              </div>
            </div>
          )}
        </div>

        {/* Playhead Line */}
        {duration > 0 && (
          <motion.div 
            layout
            className="absolute top-0 bottom-0 w-1 bg-white z-20 shadow-[0_0_20px_white]"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-white shadow-2xl border-2 border-black/20" />
          </motion.div>
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
      <div className="grid grid-cols-12 gap-10 z-10 flex-1">
        {/* Left Column: Transport & Pads */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.95 }} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 shadow-lg">
              <SkipBack size={24} className="text-white/60" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTogglePlay}
              className={`flex-1 py-4 rounded-2xl flex items-center justify-center transition-all border-2 shadow-2xl ${isPlaying ? 'bg-white/10 text-white border-white/20' : (id === 'A' ? 'bg-dj-accent text-black font-black border-dj-accent shadow-[0_0_30px_rgba(0,255,157,0.4)]' : 'bg-dj-accent-secondary text-white font-black border-dj-accent-secondary shadow-[0_0_30px_rgba(255,0,85,0.4)]')}`}
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, x: 2 }} whileTap={{ scale: 0.95 }} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 shadow-lg">
              <SkipForward size={24} className="text-white/60" />
            </motion.button>
          </div>
          
          {/* AI Insight Section */}
          <div className="bg-black/80 rounded-[2rem] p-6 border border-white/5 flex flex-col gap-4 shadow-inner relative group/insight overflow-hidden flex-1">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-dj-accent/20 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-dj-accent">
                <motion.div 
                  animate={{ rotate: isAnalyzing ? 360 : 0 }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Zap size={16} className="shadow-[0_0_10px_rgba(0,255,157,0.5)]" />
                </motion.div>
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">AI Insight</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${analysis ? 'bg-dj-accent shadow-[0_0_10px_rgba(0,255,157,0.8)] animate-pulse' : 'bg-white/10'}`} />
            </div>
            
            <div className="flex-1 relative min-h-[100px]">
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div 
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-8 h-8 border-2 border-dj-accent border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,157,0.2)]" />
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Analyzing Sonic DNA...</span>
                  </motion.div>
                ) : analysis ? (
                  <motion.div 
                    key="analysis"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5 shadow-inner">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Harmonic Key</span>
                      <span className="text-lg font-black font-mono text-dj-accent tracking-tighter shadow-sm">{analysis.key}</span>
                    </div>
                    <div className="text-[11px] text-white/80 font-medium leading-relaxed bg-dj-accent/5 p-4 rounded-2xl border border-dj-accent/10 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 left-0 w-1 h-full bg-dj-accent/30" />
                      <p className="relative z-10">{stemAdvice || analysis.transitionAdvice}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                      <Activity size={20} className="text-white/10" />
                    </div>
                    <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">
                      Load track for AI analysis
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Lyrics Button */}
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToggleLyrics}
            disabled={!track || isGettingLyrics}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all border-2 shadow-2xl ${showLyrics ? 'bg-dj-accent text-black border-dj-accent shadow-dj-accent/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            {isGettingLyrics ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <AlignLeft size={18} />
                {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
              </>
            )}
          </motion.button>
        </div>

        {/* Middle Column: Jog Wheel & Pitch */}
        <div className="col-span-4 flex flex-col items-center justify-center gap-8">
          <div className="relative group/jog">
            {/* Jog Wheel */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              ref={jogRef}
              onMouseDown={handleJogStart}
              onTouchStart={handleJogStart}
              className="relative w-64 h-64 rounded-full bg-zinc-900 border-[16px] border-zinc-950 shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(255,255,255,0.05)] cursor-grab active:cursor-grabbing overflow-hidden"
              style={{ transform: `rotate(${jogRotation}deg)` }}
            >
              {/* Vinyl Grooves */}
              <div className="absolute inset-0 rounded-full opacity-40" style={{ background: 'repeating-radial-gradient(circle, #1a1a1a, #1a1a1a 1px, #0a0a0a 3px)' }} />
              
              {/* Center Label */}
              <div className={`absolute inset-[30%] rounded-full ${id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary'} flex items-center justify-center shadow-2xl border-[6px] border-black/60 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                <div className="w-4 h-4 rounded-full bg-black/80 shadow-inner z-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-[10px] font-black text-black/90 uppercase tracking-tighter mt-8">{track?.artist || 'GO DJ'}</span>
                </div>
              </div>

              {/* Marker for rotation visibility */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-16 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] rounded-b-full mt-1 z-20" />
              
              {/* Reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
            </motion.div>

            {/* Outer Ring Glow */}
            <motion.div 
              animate={{ 
                opacity: isPlaying ? [0.1, 0.3, 0.1] : 0.05,
                scale: isPlaying ? [1, 1.02, 1] : 1
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute -inset-6 rounded-full border-2 transition-all duration-500 ${isScratching ? 'border-white opacity-80 scale-105 shadow-[0_0_40px_rgba(255,255,255,0.4)]' : (id === 'A' ? 'border-dj-accent/20' : 'border-dj-accent-secondary/20')}`} 
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-2 w-full bg-black/60 p-5 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <motion.div 
              animate={{ scale: isPlaying ? [1, 1.03, 1] : 1 }}
              transition={{ duration: 0.4, repeat: Infinity }}
              className={`text-5xl font-black font-mono tracking-tighter leading-none ${id === 'A' ? 'text-dj-accent shadow-[0_0_20px_rgba(0,255,157,0.3)]' : 'text-dj-accent-secondary shadow-[0_0_20px_rgba(255,0,85,0.3)]'}`}
            >
              {analysis ? (analysis.bpm * (1 + pitch / 100)).toFixed(1) : '---'}
            </motion.div>
            <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em] mt-1">Beats Per Minute</div>
            
            <div className="flex items-center gap-4 w-full px-4 mt-4">
              <span className="text-[9px] text-white/10 font-black">-16</span>
              <div className="flex-1 h-2 bg-zinc-900 rounded-full relative overflow-hidden border border-white/5 shadow-inner">
                <motion.div 
                  className={`absolute top-0 bottom-0 left-1/2 ${id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary'} shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
                  style={{ 
                    width: `${Math.abs(pitch / 16) * 50}%`,
                    left: pitch < 0 ? `${50 - (Math.abs(pitch / 16) * 50)}%` : '50%'
                  }}
                />
                <input 
                  type="range" 
                  min="-16" 
                  max="16" 
                  step="0.01"
                  value={pitch}
                  onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <span className="text-[9px] text-white/10 font-black">+16</span>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Pads & AI */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Sync & Master Controls */}
          <div className="flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-lg text-white/60"
            >
              MASTER
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 py-3 rounded-2xl border-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${id === 'A' ? 'bg-dj-accent/10 border-dj-accent/40 text-dj-accent shadow-[0_0_20px_rgba(0,255,157,0.2)]' : 'bg-dj-accent-secondary/10 border-dj-accent-secondary/40 text-dj-accent-secondary shadow-[0_0_20px_rgba(255,0,85,0.2)]'}`}
            >
              SYNC
            </motion.button>
          </div>

          {/* Performance Pads Section */}
          <div className="bg-black/80 rounded-[2rem] p-5 border border-white/5 shadow-inner relative overflow-hidden flex-1 flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="flex items-center justify-between mb-5 px-1">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['HOTCUE', 'SAMPLER', 'STEMS', 'SCRATCH', 'SLICER', 'STUTTER'].map((mode) => (
                  <motion.button
                    whileHover={{ y: -1 }}
                    key={mode}
                    onClick={() => setPadMode(mode as any)}
                    className={`text-[8px] font-black px-3 py-1.5 rounded-lg transition-all whitespace-nowrap tracking-widest border ${padMode === mode ? (id === 'A' ? 'bg-dj-accent text-black border-dj-accent shadow-[0_0_12px_rgba(0,255,157,0.5)]' : 'bg-dj-accent-secondary text-white border-dj-accent-secondary shadow-[0_0_12px_rgba(255,0,85,0.5)]') : 'bg-white/5 text-white/20 border-white/5 hover:text-white'}`}
                  >
                    {mode}
                  </motion.button>
                ))}
              </div>
            </div>
            
            <motion.div 
              layout
              className="grid grid-cols-4 gap-3 flex-1"
            >
              <AnimatePresence mode="wait">
                {padMode === 'STEMS' ? (
                  <motion.div 
                    key="stems"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="col-span-4 grid grid-cols-4 gap-3 h-full"
                  >
                    {[
                      { id: 'vocals', label: 'VOC', icon: <Mic size={16} />, color: 'purple' },
                      { id: 'drums', label: 'DRM', icon: <Drum size={16} />, color: 'blue' },
                      { id: 'bass', label: 'BASS', icon: <Music2 size={16} />, color: 'emerald' },
                      { id: 'other', label: 'INST', icon: <Layers size={16} />, color: 'orange' }
                    ].map((stem) => (
                      <div key={stem.id} className="flex flex-col gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => isolateStem(stem.id as any)}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all relative group overflow-hidden border-2 shadow-xl ${
                            stemStates[stem.id as keyof typeof stemStates] 
                              ? `bg-${stem.color}-500/20 border-${stem.color}-500/50 text-${stem.color}-400 shadow-[0_0_20px_rgba(0,0,0,0.3)]` 
                              : 'bg-black/60 border-white/5 text-white/10 grayscale opacity-40'
                          }`}
                        >
                          {stemStates[stem.id as keyof typeof stemStates] && (
                            <motion.div 
                              animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className={`absolute inset-0 bg-${stem.color}-500/10`} 
                            />
                          )}
                          <div className="z-10">{stem.icon}</div>
                          <span className="text-[8px] font-black z-10 tracking-widest">{stem.label}</span>
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleStem(stem.id as any)}
                          className={`py-1.5 rounded-lg text-[7px] font-black uppercase transition-all border tracking-widest ${
                            stemStates[stem.id as keyof typeof stemStates] 
                              ? 'bg-white/5 text-white/30 border-white/10 hover:text-white' 
                              : 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                          }`}
                        >
                          {stemStates[stem.id as keyof typeof stemStates] ? 'MUTE' : 'CUT'}
                        </motion.button>
                      </div>
                    ))}
                  </motion.div>
                ) : padMode === 'SAMPLER' ? (
                  <motion.div 
                    key="sampler"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="col-span-4 grid grid-cols-4 gap-3"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={i}
                        onClick={() => handleSampler(i)}
                        className="aspect-square rounded-2xl bg-black/60 border-2 border-white/5 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all group shadow-lg shadow-black/40"
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${id === 'A' ? 'bg-dj-accent/40 group-hover:bg-dj-accent' : 'bg-dj-accent-secondary/40 group-hover:bg-dj-accent-secondary'} transition-all`} />
                        <span className="text-[9px] font-black text-white/20 group-hover:text-white/60">SMPL {i + 1}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : padMode === 'SCRATCH' ? (
                  <motion.div 
                    key="scratch"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="col-span-4 grid grid-cols-4 gap-3"
                  >
                    {[0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map((intensity, i) => (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={i}
                        onMouseDown={() => handleScratch(intensity)}
                        className="aspect-square rounded-2xl bg-black/60 border-2 border-white/5 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all group shadow-lg shadow-black/40"
                      >
                        <Activity size={12} className={`text-white/10 group-hover:${id === 'A' ? 'text-dj-accent' : 'text-dj-accent-secondary'}`} />
                        <span className="text-[9px] font-black text-white/20 group-hover:text-white/60">{intensity.toFixed(1)}x</span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : padMode === 'SLICER' ? (
                  <motion.div 
                    key="slicer"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="col-span-4 grid grid-cols-4 gap-3"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={i}
                        onClick={() => handleSlicer(i)}
                        className="aspect-square rounded-2xl bg-black/60 border-2 border-white/5 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all group shadow-lg shadow-black/40"
                      >
                        <div className="flex gap-0.5">
                          {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className={`w-1 h-3 rounded-full ${i === j ? (id === 'A' ? 'bg-dj-accent' : 'bg-dj-accent-secondary') : 'bg-white/5'}`} />
                          ))}
                        </div>
                        <span className="text-[9px] font-black text-white/20 group-hover:text-white/60">SLICE {i + 1}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : padMode === 'STUTTER' ? (
                  <motion.div 
                    key="stutter"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="col-span-4 grid grid-cols-4 gap-3"
                  >
                    {[1/2, 1/4, 1/8, 1/16, 1/32, 1/64, 1/128, 1/256].map((div, i) => (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={i}
                        onClick={() => handleStutter(div)}
                        className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all group relative overflow-hidden shadow-lg ${
                          activeStutter === div 
                            ? (id === 'A' ? 'bg-dj-accent/20 border-dj-accent text-dj-accent shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 'bg-dj-accent-secondary/20 border-dj-accent-secondary text-dj-accent-secondary shadow-[0_0_15px_rgba(255,0,85,0.3)]')
                            : 'bg-black/60 border-white/5 text-white/20 hover:border-white/20'
                        }`}
                      >
                        <div className={`text-[10px] font-black ${activeStutter === div ? 'animate-pulse' : ''}`}>
                          1/{Math.round(1/div)}
                        </div>
                        <span className="text-[7px] font-black opacity-40 uppercase tracking-tighter">STUTTER</span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="hotcue"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="col-span-4 grid grid-cols-4 gap-3"
                  >
                    {hotCues.map((cue, i) => (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={i}
                        onClick={() => handleHotCue(i)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative group overflow-hidden border-2 shadow-lg ${
                          cue !== null 
                            ? (id === 'A' ? 'bg-dj-accent/20 border-dj-accent text-dj-accent shadow-[0_0_15px_rgba(0,255,157,0.2)]' : 'bg-dj-accent-secondary/20 border-dj-accent-secondary text-dj-accent-secondary shadow-[0_0_15px_rgba(255,0,85,0.2)]')
                            : 'bg-black/60 border-white/5 text-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="z-10 text-[10px] font-black">{i + 1}</div>
                        <span className="text-[8px] font-black z-10 uppercase tracking-tighter">
                          {cue !== null ? formatTime(cue) : 'EMPTY'}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* AI Insight Section */}
          {/* Moved to left column */}
        </div>
      </div>
    </motion.div>
  );
};
