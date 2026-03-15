import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Zap, Activity, Circle, Play, Square, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AutomationPoint {
  time: number;
  slotIdx: number;
  param: string;
  value: any;
}

interface MixerProps {
  crossfader: number;
  onCrossfaderChange: (val: number) => void;
  curve: 'linear' | 'log' | 'exp';
  onCurveChange: (curve: 'linear' | 'log' | 'exp') => void;
  masterVolume: number;
  onMasterVolumeChange: (val: number) => void;
  eqA: { high: number; mid: number; low: number };
  eqB: { high: number; mid: number; low: number };
  onEqChange: (deck: 'A' | 'B', param: 'high' | 'mid' | 'low', val: number) => void;
  stemsA: { vocals: number; drums: number; bass: number; other: number };
  stemsB: { vocals: number; drums: number; bass: number; other: number };
  onStemsChange: (deck: 'A' | 'B', param: 'vocals' | 'drums' | 'bass' | 'other', val: number) => void;
  isModernEqMode: boolean;
  onModernEqToggle: () => void;
  isSyncEnabled: boolean;
  onSyncToggle: () => void;
  lightingIntensity: number;
  onLightingChange: (val: number) => void;
  samplerVolume: number;
  onSamplerVolumeChange: (val: number) => void;
}

type EqParam = 'high' | 'mid' | 'low';

export const Mixer: React.FC<MixerProps> = ({
  crossfader,
  onCrossfaderChange,
  curve,
  onCurveChange,
  masterVolume,
  onMasterVolumeChange,
  eqA,
  eqB,
  onEqChange,
  stemsA,
  stemsB,
  onStemsChange,
  isModernEqMode,
  onModernEqToggle,
  isSyncEnabled,
  onSyncToggle,
  lightingIntensity,
  onLightingChange,
  samplerVolume,
  onSamplerVolumeChange,
  isQuantizeEnabled,
  onQuantizeToggle
}) => {
  const [fxChain, setFxChain] = React.useState([
    { id: 'fx1', type: 'ECHO', level: 0.5, beat: '1/4', isActive: false },
    { id: 'fx2', type: 'FILTER', level: 0.5, beat: '1', isActive: false },
    { id: 'fx3', type: 'REVERB', level: 0.3, beat: '1/2', isActive: false }
  ]);
  const [activeFxSlot, setActiveFxSlot] = React.useState(0);
  const [fxAssign, setFxAssign] = React.useState<'A' | 'B' | 'MST'>('MST');
  
  // Automation State
  const [isRecordingAuto, setIsRecordingAuto] = useState(false);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [automationData, setAutomationData] = useState<AutomationPoint[]>([]);
  const autoStartTime = useRef<number>(0);
  const playbackTimer = useRef<number | null>(null);

  const startRecording = () => {
    setAutomationData([]);
    autoStartTime.current = Date.now();
    setIsRecordingAuto(true);
    setIsPlayingAuto(false);
  };

  const stopRecording = () => {
    setIsRecordingAuto(false);
  };

  const startPlayback = () => {
    if (automationData.length === 0) return;
    setIsPlayingAuto(true);
    setIsRecordingAuto(false);
    const startTime = Date.now();
    
    // Simple playback engine
    automationData.forEach(point => {
      setTimeout(() => {
        // Only apply if still playing
        setIsPlayingAuto(current => {
          if (current) {
            updateFx(point.slotIdx, { [point.param]: point.value });
          }
          return current;
        });
      }, point.time);
    });

    // Stop playing after last point + buffer
    const duration = automationData[automationData.length - 1].time;
    setTimeout(() => setIsPlayingAuto(false), duration + 100);
  };

  const recordPoint = (slotIdx: number, param: string, value: any) => {
    if (isRecordingAuto) {
      const time = Date.now() - autoStartTime.current;
      setAutomationData(prev => [...prev, { time, slotIdx, param, value }]);
    }
  };

  // Store pre-kill values
  const [prevEqA, setPrevEqA] = React.useState({ high: 0, mid: 0, low: 0 });
  const [prevEqB, setPrevEqB] = React.useState({ high: 0, mid: 0, low: 0 });

  const handleEqKill = (deck: 'A' | 'B', param: EqParam) => {
    const currentEq = deck === 'A' ? eqA : eqB;
    const prevEq = deck === 'A' ? prevEqA : prevEqB;
    const setPrevEq = deck === 'A' ? setPrevEqA : setPrevEqB;

    if (currentEq[param] !== -1) {
      // Killing: store current value and set to -1
      setPrevEq(prev => ({ ...prev, [param]: currentEq[param] }));
      onEqChange(deck, param, -1);
    } else {
      // Unkilling: restore previous value
      onEqChange(deck, param, prevEq[param]);
    }
  };

  const AVAILABLE_EFFECTS = [
    'ECHO', 'DELAY', 'REVERB', 'SPIRAL', 'TRANS', 'FILTER', 'FLANGER', 'PHASER', 
    'PITCH', 'SLIP ROLL', 'ROLL', 'VINYL BRAKE', 'HELIX', 'MOBIUS', 'NOISE', 'CRUSH'
  ];

  const BEATS = ['1/16', '1/8', '1/4', '1/2', '1', '2', '4', '8'];

  const updateFx = (slotIdx: number, updates: any) => {
    setFxChain(prev => prev.map((fx, i) => i === slotIdx ? { ...fx, ...updates } : fx));
    
    // Record automation points
    Object.entries(updates).forEach(([param, value]) => {
      recordPoint(slotIdx, param, value);
    });
  };

  const moveFx = (from: number, to: number) => {
    if (to < 0 || to >= fxChain.length) return;
    const newChain = [...fxChain];
    const [moved] = newChain.splice(from, 1);
    newChain.splice(to, 0, moved);
    setFxChain(newChain);
    setActiveFxSlot(to);
  };

  const KillButton = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-6 h-4 rounded-sm text-[6px] font-black flex items-center justify-center transition-all border shadow-sm ${
        active 
          ? 'bg-red-600 text-white border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
          : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-500'
      }`}
    >
      KILL
    </button>
  );

  const renderKnob = (label: string, value: number, onChange: (val: number) => void, color: string = 'bg-dj-accent') => (
    <div className="flex flex-col items-center gap-1">
      <div className="knob-container" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percent = 1 - (y / rect.height);
        onChange(percent * 2 - 1);
      }}>
        <div 
          className={`knob-indicator ${color}`} 
          style={{ transform: `rotate(${value * 135}deg)` }} 
        />
      </div>
      <span className="text-[8px] text-white/40 uppercase font-bold">{label}</span>
    </div>
  );

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-[450px] pro-card p-8 flex flex-col gap-8 relative overflow-hidden group/mixer"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Mixer Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Settings2 className="text-white/40" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase text-white/90">Master Mixer</h2>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">4-Channel Control</p>
          </div>
        </div>
        <div className="flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <Mic size={18} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <Headphones size={18} />
          </motion.button>
        </div>
      </div>

      {/* Master Section */}
      <div className="bg-black/60 rounded-[2rem] p-6 border border-white/5 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="text-[8px] font-black text-dj-accent tracking-[0.2em] uppercase opacity-50">Master</div>
            {renderKnob('', masterVolume, onMasterVolumeChange, 'bg-white')}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-[8px] font-black text-orange-400 tracking-[0.2em] uppercase opacity-50">Sampler</div>
            {renderKnob('', samplerVolume, onSamplerVolumeChange, 'bg-orange-500')}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-[8px] font-black text-purple-400 tracking-[0.2em] uppercase opacity-50">Light</div>
            {renderKnob('', lightingIntensity, onLightingChange, 'bg-purple-500')}
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSyncToggle}
              className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isSyncEnabled ? 'bg-dj-accent text-black border-dj-accent shadow-[0_0_20px_rgba(0,255,157,0.4)]' : 'bg-white/5 text-white/40 border-white/10'}`}
            >
              SYNC
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onQuantizeToggle}
              className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isQuantizeEnabled ? 'bg-dj-accent-secondary text-white border-dj-accent-secondary shadow-[0_0_20px_rgba(255,0,85,0.4)]' : 'bg-white/5 text-white/40 border-white/10'}`}
            >
              QUANTIZE
            </motion.button>
          </div>
          <div className="bg-black/90 rounded-2xl p-3 border border-white/5 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <Cpu size={14} className="text-dj-accent" />
              <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.2em]">PIONEER DDJ-1000</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[6px] text-dj-accent font-black uppercase">Online</span>
              <motion.div 
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-dj-accent shadow-[0_0_10px_rgba(0,255,157,0.8)]" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* EQ Section */}
      <div className="bg-black/40 rounded-[2.5rem] p-8 border border-white/5 shadow-inner relative overflow-hidden flex-1">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex flex-col">
            <div className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">
              {isModernEqMode ? 'Stem Separation' : 'Frequency EQ'}
            </div>
            <div className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Advanced DSP Engine</div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onModernEqToggle}
            className={`px-5 py-2 rounded-xl text-[8px] font-black transition-all border tracking-[0.2em] ${isModernEqMode ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-white/40 border-white/10'}`}
          >
            {isModernEqMode ? 'STEMS' : 'FREQ'}
          </motion.button>
        </div>
        
        <div className="flex justify-between gap-10 h-full">
          <div className="flex flex-col gap-6 flex-1">
            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] text-center mb-2">Channel A</div>
            {isModernEqMode ? (
              <div className="space-y-6">
                {renderKnob('VOCALS', stemsA.vocals, (v) => onStemsChange('A', 'vocals', v), 'bg-dj-accent-blue')}
                {renderKnob('DRUMS', stemsA.drums, (v) => onStemsChange('A', 'drums', v), 'bg-dj-accent-secondary')}
                {renderKnob('BASS', stemsA.bass, (v) => onStemsChange('A', 'bass', v), 'bg-dj-accent')}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4">
                  {renderKnob('HIGH', eqA.high, (v) => onEqChange('A', 'high', v))}
                  <KillButton active={eqA.high === -1} onClick={() => handleEqKill('A', 'high')} />
                </div>
                <div className="flex items-center justify-center gap-4">
                  {renderKnob('MID', eqA.mid, (v) => onEqChange('A', 'mid', v))}
                  <KillButton active={eqA.mid === -1} onClick={() => handleEqKill('A', 'mid')} />
                </div>
                <div className="flex items-center justify-center gap-4">
                  {renderKnob('LOW', eqA.low, (v) => onEqChange('A', 'low', v))}
                  <KillButton active={eqA.low === -1} onClick={() => handleEqKill('A', 'low')} />
                </div>
              </div>
            )}
          </div>
          
          <div className="w-px bg-white/5 my-4 shadow-[1px_0_0_rgba(255,255,255,0.02)]" />
          
          <div className="flex flex-col gap-6 flex-1">
            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] text-center mb-2">Channel B</div>
            {isModernEqMode ? (
              <div className="space-y-6">
                {renderKnob('VOCALS', stemsB.vocals, (v) => onStemsChange('B', 'vocals', v), 'bg-dj-accent-blue')}
                {renderKnob('DRUMS', stemsB.drums, (v) => onStemsChange('B', 'drums', v), 'bg-dj-accent-secondary')}
                {renderKnob('BASS', stemsB.bass, (v) => onStemsChange('B', 'bass', v), 'bg-dj-accent')}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4">
                  {renderKnob('HIGH', eqB.high, (v) => onEqChange('B', 'high', v))}
                  <KillButton active={eqB.high === -1} onClick={() => handleEqKill('B', 'high')} />
                </div>
                <div className="flex items-center justify-center gap-4">
                  {renderKnob('MID', eqB.mid, (v) => onEqChange('B', 'mid', v))}
                  <KillButton active={eqB.mid === -1} onClick={() => handleEqKill('B', 'mid')} />
                </div>
                <div className="flex items-center justify-center gap-4">
                  {renderKnob('LOW', eqB.low, (v) => onEqChange('B', 'low', v))}
                  <KillButton active={eqB.low === -1} onClick={() => handleEqKill('B', 'low')} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-FX Chain Section */}
      <div className="bg-dj-card-dark rounded-2xl p-4 border border-white/10 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Multi-FX Chain</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="text-[7px] text-white/20 uppercase font-black tracking-widest">Serial Chain</div>
              {automationData.length > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20"
                >
                  <Activity size={10} className="text-orange-500 animate-pulse" />
                  <span className="text-[7px] text-orange-400 font-black uppercase tracking-tighter">Auto Active</span>
                </motion.div>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            {['A', 'B', 'MST'].map(target => (
              <motion.button
                whileHover={{ y: -1 }}
                key={target}
                onClick={() => setFxAssign(target as any)}
                className={`px-2.5 py-1 rounded-md text-[8px] font-black transition-all border tracking-widest ${fxAssign === target ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]' : 'bg-white/5 text-white/30 border-white/5'}`}
              >
                {target}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chain Overview */}
        <div className="flex flex-col gap-2">
          {fxChain.map((fx, i) => (
            <motion.div 
              layout
              key={fx.id}
              className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${activeFxSlot === i ? 'bg-orange-500/10 border-orange-500/40 shadow-lg' : 'bg-black/60 border-white/5 hover:border-white/10'}`}
              onClick={() => setActiveFxSlot(i)}
            >
              {activeFxSlot === i && (
                <motion.div layoutId="active-fx" className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
              )}
              <div className="text-[8px] font-black text-white/10 w-4">{i + 1}</div>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black tracking-widest ${fx.isActive ? 'text-orange-400' : 'text-white/30'}`}>{fx.type}</span>
                  <span className="text-[7px] text-white/20 font-mono font-bold">{Math.round(fx.level * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    animate={{ width: `${fx.level * 100}%` }}
                    className={`h-full transition-colors ${fx.isActive ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-white/10'}`} 
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <motion.button 
                  whileHover={{ scale: 1.2 }}
                  onClick={(e) => { e.stopPropagation(); moveFx(i, i - 1); }}
                  disabled={i === 0}
                  className="p-1 text-white/10 hover:text-white disabled:opacity-0 transition-colors"
                >
                  <ChevronUp size={12} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.2 }}
                  onClick={(e) => { e.stopPropagation(); moveFx(i, i + 1); }}
                  disabled={i === fxChain.length - 1}
                  className="p-1 text-white/10 hover:text-white disabled:opacity-0 transition-colors"
                >
                  <ChevronDown size={12} />
                </motion.button>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); updateFx(i, { isActive: !fx.isActive }); }}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-lg ${fx.isActive ? 'bg-orange-500 border-orange-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-white/5 border-white/10 text-white/20'}`}
              >
                <div className={`w-2 h-2 rounded-full ${fx.isActive ? 'bg-black' : 'bg-white/20'}`} />
              </motion.button>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between bg-black/80 p-2 rounded-xl border border-white/5 shadow-inner">
          <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">Automation</div>
          <div className="flex gap-2">
            <AnimatePresence mode="wait">
              {!isRecordingAuto ? (
                <motion.button 
                  key="rec"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startRecording}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[8px] font-black uppercase transition-all border border-red-500/20 shadow-lg"
                >
                  <Circle size={10} fill="currentColor" />
                  REC
                </motion.button>
              ) : (
                <motion.button 
                  key="stop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black text-[8px] font-black uppercase transition-all border border-white/20 animate-pulse shadow-lg"
                >
                  <Square size={10} fill="currentColor" />
                  STOP
                </motion.button>
              )}
            </AnimatePresence>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startPlayback}
              disabled={automationData.length === 0 || isPlayingAuto}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all border shadow-lg ${isPlayingAuto ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-white disabled:opacity-30'}`}
            >
              <Play size={10} fill="currentColor" />
              PLAY
            </motion.button>

            <motion.button 
              whileHover={{ rotate: -180 }}
              onClick={() => setAutomationData([])}
              disabled={automationData.length === 0}
              className="p-1.5 text-white/10 hover:text-white disabled:opacity-0 transition-all"
            >
              <RotateCcw size={14} />
            </motion.button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-black/80 p-2 rounded-xl border border-white/5 shadow-inner">
          <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">Slot {activeFxSlot + 1} Config</div>
          <div className="text-[7px] text-orange-400/40 font-black uppercase tracking-widest">Select FX Type</div>
        </div>

        <div className="relative h-24 overflow-y-auto scrollbar-hide bg-black/80 rounded-xl border border-white/5 p-2 shadow-inner">
          <div className="grid grid-cols-2 gap-1.5">
            {AVAILABLE_EFFECTS.map(fx => (
              <motion.button
                whileHover={{ x: 2 }}
                key={fx}
                onClick={() => updateFx(activeFxSlot, { type: fx })}
                className={`text-left px-3 py-1.5 rounded-lg text-[8px] font-black transition-all truncate border ${fxChain[activeFxSlot].type === fx ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-lg' : 'text-white/10 hover:text-white/30 border-transparent'}`}
              >
                {fx}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-black/80 p-3 rounded-2xl border border-white/5 shadow-inner">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const idx = BEATS.indexOf(fxChain[activeFxSlot].beat);
                if (idx > 0) updateFx(activeFxSlot, { beat: BEATS[idx - 1] });
              }}
              className="text-white/30 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"
            >
              <Zap size={16} />
            </motion.button>
            
            <div className="flex flex-col items-center">
              <motion.div 
                key={fxChain[activeFxSlot].beat}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xl font-black font-mono text-orange-400 tracking-tighter"
              >
                {fxChain[activeFxSlot].beat}
              </motion.div>
              <div className="text-[7px] text-white/20 uppercase font-black tracking-[0.2em]">Beat Division</div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const idx = BEATS.indexOf(fxChain[activeFxSlot].beat);
                if (idx < BEATS.length - 1) updateFx(activeFxSlot, { beat: BEATS[idx + 1] });
              }}
              className="text-white/30 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"
            >
              <Activity size={16} />
            </motion.button>
          </div>
          
          <div className="flex justify-around items-end pt-4">
            {renderKnob('WET/DRY', fxChain[activeFxSlot].level, (v) => updateFx(activeFxSlot, { level: v }), 'bg-orange-500')}
            <div className="flex flex-col items-center gap-3">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateFx(activeFxSlot, { isActive: !fxChain[activeFxSlot].isActive })}
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center group transition-all relative shadow-2xl ${
                  fxChain[activeFxSlot].isActive ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)]' : 'border-orange-500/20 hover:border-orange-500/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full transition-all ${
                  fxChain[activeFxSlot].isActive 
                    ? 'bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.8)] animate-pulse scale-105' 
                    : 'bg-orange-900/40 group-hover:bg-orange-900/60'
                }`} />
                {fxChain[activeFxSlot].isActive && (
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-4 border-orange-500" 
                  />
                )}
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-black transition-colors shadow-lg ${
                  fxChain[activeFxSlot].isActive ? 'bg-dj-accent' : 'bg-white/10'
                }`} />
              </motion.button>
              <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${fxChain[activeFxSlot].isActive ? 'text-orange-400' : 'text-white/20'}`}>
                {fxChain[activeFxSlot].isActive ? 'ACTIVE' : 'ON/OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Crossfader Curve & Crossfader */}
      <div className="mt-auto flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em] text-center">Crossfader Curve</div>
          <div className="flex bg-black/80 p-1.5 rounded-xl border border-white/5 shadow-inner">
            {(['linear', 'log', 'exp'] as const).map((c) => (
              <motion.button
                whileHover={{ y: -1 }}
                key={c}
                onClick={() => onCurveChange(c)}
                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${curve === c ? 'bg-dj-accent text-black shadow-[0_0_12px_rgba(0,255,157,0.4)]' : 'text-white/20 hover:text-white'}`}
              >
                {c}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex justify-between w-full text-[9px] text-white/20 font-black tracking-widest px-2">
            <span>DECK A</span>
            <span>DECK B</span>
          </div>
          <div className="crossfader-track w-full h-10 relative bg-black/80 rounded-xl border border-white/10 shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-dj-accent/5 via-transparent to-dj-accent-secondary/5" />
            <motion.div 
              layout
              className="absolute top-1/2 -translate-y-1/2 w-10 h-8 bg-zinc-800 border border-white/20 rounded-md shadow-2xl z-20 flex items-center justify-center"
              style={{ left: `${(crossfader + 1) * 50}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-1 h-full bg-dj-accent shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
            </motion.div>
            <input 
              type="range" 
              min="-1" 
              max="1" 
              step="0.01"
              value={crossfader}
              onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
