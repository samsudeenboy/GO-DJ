import React, { useState, useEffect, useRef } from 'react';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { Library } from './components/Library';
import { AutoDjControls } from './components/AutoDjControls';
import { Visualizer } from './components/Visualizer';
import { Track, SAMPLE_TRACKS } from './constants';
import { Zap, Settings, HelpCircle, Maximize2, Monitor, Layout, Radio, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTransitionAdvice, getAutoDjSuggestion } from './services/geminiService';

export default function App() {
  // Audio State
  const [deckA, setDeckA] = useState<Track | null>(null);
  const [deckB, setDeckB] = useState<Track | null>(null);
  
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  
  const [pitchA, setPitchA] = useState(0);
  const [pitchB, setPitchB] = useState(0);
  
  const [baseBpmA, setBaseBpmA] = useState<number | null>(null);
  const [baseBpmB, setBaseBpmB] = useState<number | null>(null);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  
  const [currentTimeA, setCurrentTimeA] = useState(0);
  const [currentTimeB, setCurrentTimeB] = useState(0);

  // Auto-DJ State
  const [isAutoDjActive, setIsAutoDjActive] = useState(false);
  const [autoDjMood, setAutoDjMood] = useState('energetic');
  const [autoDjReason, setAutoDjReason] = useState<string | undefined>();
  const isTransitioning = useRef(false);

  // Sync Logic
  useEffect(() => {
    if (isSyncEnabled && baseBpmA && baseBpmB) {
      const currentBpmA = baseBpmA * (1 + pitchA / 100);
      const requiredPitchB = ((currentBpmA / baseBpmB) - 1) * 100;
      setPitchB(requiredPitchB);
    }
  }, [isSyncEnabled, pitchA, baseBpmA, baseBpmB]);

  const [crossfader, setCrossfader] = useState(0);
  const [crossfaderCurve, setCrossfaderCurve] = useState<'linear' | 'log' | 'exp'>('linear');
  const [masterVolume, setMasterVolume] = useState(0.8);
  
  const [eqA, setEqA] = useState({ high: 0, mid: 0, low: 0 });
  const [eqB, setEqB] = useState({ high: 0, mid: 0, low: 0 });

  const [stemsA, setStemsA] = useState({ vocals: 0, drums: 0, bass: 0, other: 0 });
  const [stemsB, setStemsB] = useState({ vocals: 0, drums: 0, bass: 0, other: 0 });
  const [isModernEqMode, setIsModernEqMode] = useState(false);

  // Pro Features State
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [vizMode, setVizMode] = useState<'psychedelic' | 'tunnel' | 'ambient' | 'equalizer'>('psychedelic');
  const [lightingIntensity, setLightingIntensity] = useState(0.5);
  const [samplerVolume, setSamplerVolume] = useState(0.5);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);

  // AI State
  const [transitionAdvice, setTransitionAdvice] = useState<string | null>(null);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);

  // Audio Refs (Simulating Audio Engine)
  const timerA = useRef<number | null>(null);
  const timerB = useRef<number | null>(null);

  useEffect(() => {
    if (isPlayingA) {
      timerA.current = window.setInterval(() => {
        setCurrentTimeA(prev => (prev < (deckA?.duration || 0) ? prev + 1 : prev));
      }, 1000);
    } else {
      if (timerA.current) clearInterval(timerA.current);
    }
    return () => { if (timerA.current) clearInterval(timerA.current); };
  }, [isPlayingA, deckA]);

  useEffect(() => {
    if (isPlayingB) {
      timerB.current = window.setInterval(() => {
        setCurrentTimeB(prev => (prev < (deckB?.duration || 0) ? prev + 1 : prev));
      }, 1000);
    } else {
      if (timerB.current) clearInterval(timerB.current);
    }
    return () => { if (timerB.current) clearInterval(timerB.current); };
  }, [isPlayingB, deckB]);

  // Auto-DJ Logic
  useEffect(() => {
    if (!isAutoDjActive || isTransitioning.current) return;

    const checkTransition = async () => {
      const activeDeck = isPlayingA ? 'A' : isPlayingB ? 'B' : null;
      if (!activeDeck) return;

      const currentTrack = activeDeck === 'A' ? deckA : deckB;
      const currentTime = activeDeck === 'A' ? currentTimeA : currentTimeB;
      
      if (currentTrack && currentTrack.duration - currentTime <= 10) {
        isTransitioning.current = true;
        const suggestion = await getAutoDjSuggestion(currentTrack, SAMPLE_TRACKS, autoDjMood);
        setAutoDjReason(suggestion.reason);
        
        const nextTrack = SAMPLE_TRACKS.find(t => t.id === suggestion.trackId) || SAMPLE_TRACKS[0];
        const targetDeck = activeDeck === 'A' ? 'B' : 'A';
        
        handleLoadTrack(nextTrack, targetDeck);
        
        // Start playing next deck
        if (targetDeck === 'A') setIsPlayingA(true);
        else setIsPlayingB(true);

        // Crossfade
        let step = 0;
        const crossfadeInterval = setInterval(() => {
          step += 0.1;
          const targetValue = targetDeck === 'A' ? -1 : 1;
          setCrossfader(prev => {
            const next = prev + (targetValue - prev) * 0.1;
            if (Math.abs(next - targetValue) < 0.05) {
              clearInterval(crossfadeInterval);
              // Stop old deck
              if (targetDeck === 'A') setIsPlayingB(false);
              else setIsPlayingA(false);
              isTransitioning.current = false;
              return targetValue;
            }
            return next;
          });
        }, 200);
      }
    };

    checkTransition();
  }, [isAutoDjActive, currentTimeA, currentTimeB, isPlayingA, isPlayingB, deckA, deckB, autoDjMood]);

  const handleLoadTrack = (track: Track, deck: 'A' | 'B') => {
    if (deck === 'A') {
      setDeckA(track);
      setCurrentTimeA(0);
      setIsPlayingA(false);
    } else {
      setDeckB(track);
      setCurrentTimeB(0);
      setIsPlayingB(false);
    }
  };

  const handleGetTransitionAdvice = async () => {
    if (!deckA || !deckB) return;
    setIsGettingAdvice(true);
    const advice = await getTransitionAdvice(deckA.title, deckB.title);
    setTransitionAdvice(advice);
    setIsGettingAdvice(false);
  };

  const getDeckVolume = (deck: 'A' | 'B') => {
    if (isSandboxMode) {
      // In sandbox mode, only the non-sandbox deck goes to master
      // This is a simplified simulation
      return 0.8; 
    }
    const x = deck === 'A' ? crossfader : -crossfader;
    // x is 0 at center, 1 when fully audible, -1 when fully silent
    
    // Normalize to 0-1 range where 1 is fully audible, 0 is silent
    // For Deck A: crossfader -1 -> 1, 0 -> 1, 1 -> 0
    // For Deck B: crossfader -1 -> 0, 0 -> 1, 1 -> 1
    
    const val = deck === 'A' ? (crossfader > 0 ? 1 - crossfader : 1) : (crossfader < 0 ? 1 + crossfader : 1);
    
    if (crossfaderCurve === 'linear') return val;
    if (crossfaderCurve === 'log') return Math.sqrt(val);
    if (crossfaderCurve === 'exp') return Math.pow(val, 3);
    return val;
  };

  return (
    <div className="h-screen flex flex-col bg-dj-bg overflow-hidden select-none">
      <Visualizer 
        isPlaying={isPlayingA || isPlayingB} 
        bpm={baseBpmA || 120} 
        intensity={lightingIntensity} 
        mode={vizMode} 
      />
      
      {/* Top Header */}
      <header className="h-14 border-b border-dj-border flex items-center justify-between px-6 bg-dj-card/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-dj-accent flex items-center justify-center text-black">
            <Zap size={20} fill="currentColor" />
          </div>
          <h1 className="font-bold tracking-tighter text-xl">AURA <span className="text-dj-accent">AI DJ</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${isSandboxMode ? 'bg-orange-500 animate-pulse' : isAutoDjActive ? 'bg-purple-500 animate-ping' : 'bg-dj-accent animate-pulse'}`} />
            <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
              {isSandboxMode ? 'Sandbox Mode' : isAutoDjActive ? 'Auto-DJ Active' : 'Engine Ready'}
            </span>
          </div>
          <div className="flex gap-4 text-white/40">
            <Monitor 
              size={18} 
              className={`cursor-pointer transition-colors ${vizMode !== 'ambient' ? 'text-dj-accent' : 'hover:text-white'}`}
              onClick={() => setVizMode(prev => prev === 'psychedelic' ? 'tunnel' : prev === 'tunnel' ? 'equalizer' : 'psychedelic')}
            />
            <Layout size={18} className="hover:text-white cursor-pointer transition-colors" />
            <Settings size={18} className="hover:text-white cursor-pointer transition-colors" />
            <Maximize2 size={18} className="hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </header>

      {/* Main Work Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Deck A */}
        <div className="flex-1 p-6 flex flex-col">
          <Deck 
            id="A"
            track={deckA}
            isPlaying={isPlayingA}
            onTogglePlay={() => setIsPlayingA(!isPlayingA)}
            volume={getDeckVolume('A')}
            pitch={pitchA}
            onPitchChange={setPitchA}
            currentTime={currentTimeA}
            duration={deckA?.duration || 0}
            onSeek={setCurrentTimeA}
            onBpmDetected={setBaseBpmA}
            stems={stemsA}
            onStemsChange={(param, val) => setStemsA(prev => ({ ...prev, [param]: val }))}
            isSandbox={isSandboxMode}
            onToggleSandbox={() => setIsSandboxMode(!isSandboxMode)}
          />
        </div>

        {/* Mixer */}
        <div className="flex flex-col gap-4 py-6">
          <Mixer 
            crossfader={crossfader}
            onCrossfaderChange={setCrossfader}
            curve={crossfaderCurve}
            onCurveChange={setCrossfaderCurve}
            masterVolume={masterVolume}
            onMasterVolumeChange={setMasterVolume}
            eqA={eqA}
            eqB={eqB}
            onEqChange={(deck, param, val) => {
              if (deck === 'A') setEqA(prev => ({ ...prev, [param]: val }));
              else setEqB(prev => ({ ...prev, [param]: val }));
            }}
            stemsA={stemsA}
            stemsB={stemsB}
            onStemsChange={(deck, param, val) => {
              if (deck === 'A') setStemsA(prev => ({ ...prev, [param]: val }));
              else setStemsB(prev => ({ ...prev, [param]: val }));
            }}
            isModernEqMode={isModernEqMode}
            onModernEqToggle={() => setIsModernEqMode(!isModernEqMode)}
            isSyncEnabled={isSyncEnabled}
            onSyncToggle={() => setIsSyncEnabled(!isSyncEnabled)}
            lightingIntensity={lightingIntensity}
            onLightingChange={setLightingIntensity}
            samplerVolume={samplerVolume}
            onSamplerVolumeChange={setSamplerVolume}
          />
          
          <AutoDjControls 
            isActive={isAutoDjActive}
            onToggle={setIsAutoDjActive}
            mood={autoDjMood}
            onMoodChange={setAutoDjMood}
            nextTrackReason={autoDjReason}
          />
        </div>

        {/* Deck B */}
        <div className="flex-1 p-6 flex flex-col">
          <Deck 
            id="B"
            track={deckB}
            isPlaying={isPlayingB}
            onTogglePlay={() => setIsPlayingB(!isPlayingB)}
            volume={getDeckVolume('B')}
            pitch={pitchB}
            onPitchChange={setPitchB}
            currentTime={currentTimeB}
            duration={deckB?.duration || 0}
            onSeek={setCurrentTimeB}
            onBpmDetected={setBaseBpmB}
            stems={stemsB}
            onStemsChange={(param, val) => setStemsB(prev => ({ ...prev, [param]: val }))}
            isSandbox={isSandboxMode}
            onToggleSandbox={() => setIsSandboxMode(!isSandboxMode)}
          />
        </div>
      </main>

      {/* AI Transition Panel (Overlay/Floating) */}
      <AnimatePresence>
        {deckA && deckB && !isAutoDjActive && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-80 left-1/2 -translate-x-1/2 z-30 w-[500px]"
          >
            <div className="bg-dj-card/90 backdrop-blur-xl border border-dj-accent/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-dj-accent/20 flex items-center justify-center text-dj-accent">
                <Zap size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-dj-accent uppercase tracking-widest">AI Transition Assistant</h4>
                <p className="text-sm text-white/80 leading-snug">
                  {transitionAdvice || "Ready to suggest a transition between these tracks."}
                </p>
              </div>
              <button 
                onClick={handleGetTransitionAdvice}
                disabled={isGettingAdvice}
                className="px-4 py-2 bg-dj-accent text-black font-bold rounded-lg text-xs hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isGettingAdvice ? 'THINKING...' : 'ADVISE ME'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library */}
      <Library onLoadTrack={handleLoadTrack} />
      
      {/* Footer Status */}
      <footer className="h-8 bg-black border-t border-dj-border flex items-center justify-between px-6 text-[10px] text-white/30 uppercase tracking-[0.2em]">
        <div className="flex gap-4">
          <span>CPU: 12%</span>
          <span>LATENCY: 4MS</span>
        </div>
        <div className="flex gap-4">
          <span className={isAutoDjActive ? 'text-purple-500' : ''}>AUTO-DJ: {isAutoDjActive ? 'ON' : 'OFF'}</span>
          <span>QUANTIZE: ON</span>
        </div>
      </footer>
    </div>
  );
}
