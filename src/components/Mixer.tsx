import React from 'react';
import { Cpu, Zap, Activity } from 'lucide-react';

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
  onSamplerVolumeChange
}) => {
  const [selectedEffect, setSelectedEffect] = React.useState('ECHO');
  const [fxLevel, setFxLevel] = React.useState(0);
  const [fxBeat, setFxBeat] = React.useState('1/4');
  const [fxAssign, setFxAssign] = React.useState<'A' | 'B' | 'MST'>('MST');
  const [isFxActive, setIsFxActive] = React.useState(false);
  
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
    <div className="w-80 bg-dj-card border-x border-dj-border flex flex-col p-4 gap-4 shadow-inner z-20 overflow-y-auto scrollbar-hide">
      {/* Master Section */}
      <div className="bg-black/40 rounded-xl p-3 border border-white/5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col items-center gap-1">
            <div className="text-[7px] font-bold text-dj-accent tracking-widest uppercase opacity-50">Master</div>
            {renderKnob('', masterVolume, onMasterVolumeChange, 'bg-white')}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[7px] font-bold text-orange-400 tracking-widest uppercase opacity-50">Sampler</div>
            {renderKnob('', samplerVolume, onSamplerVolumeChange, 'bg-orange-500')}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[7px] font-bold text-purple-400 tracking-widest uppercase opacity-50">Light</div>
            {renderKnob('', lightingIntensity, onLightingChange, 'bg-purple-500')}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1">
            <button 
              onClick={onSyncToggle}
              className={`py-1.5 rounded text-[7px] font-bold uppercase tracking-widest transition-all border ${isSyncEnabled ? 'bg-dj-accent text-black border-dj-accent' : 'bg-white/5 text-white/40 border-white/10'}`}
            >
              SYNC
            </button>
            <button 
              className="py-1.5 rounded text-[7px] font-bold uppercase tracking-widest transition-all border bg-dj-accent-secondary/20 text-dj-accent-secondary border-dj-accent-secondary/40"
            >
              QUANTIZE
            </button>
          </div>
          <div className="bg-black/60 rounded p-1.5 border border-white/5 flex items-center justify-between">
            <Cpu size={10} className="text-dj-accent" />
            <span className="text-[7px] text-white/60 font-bold uppercase">PIONEER DDJ-1000 CONNECTED</span>
            <div className="w-1.5 h-1.5 rounded-full bg-dj-accent animate-pulse" />
          </div>
        </div>
      </div>

      {/* EQ Section */}
      <div className="bg-black/20 rounded-xl p-3 border border-white/5">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
            {isModernEqMode ? 'ModernEQ (Stems)' : 'Standard EQ'}
          </div>
          <button 
            onClick={onModernEqToggle}
            className={`px-2 py-0.5 rounded text-[7px] font-bold transition-all border ${isModernEqMode ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-white/40 border-white/10'}`}
          >
            {isModernEqMode ? 'STEMS MODE' : 'FREQ MODE'}
          </button>
        </div>
        
        <div className="flex justify-between gap-4">
          <div className="flex flex-col gap-3 flex-1">
            <div className="text-[7px] font-bold text-white/20 uppercase tracking-widest text-center mb-1">Deck A</div>
            {isModernEqMode ? (
              <>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('VOC', stemsA.vocals, (v) => onStemsChange('A', 'vocals', v), 'bg-purple-400')}
                </div>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('DRM', stemsA.drums, (v) => onStemsChange('A', 'drums', v), 'bg-blue-400')}
                </div>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('BS', stemsA.bass, (v) => onStemsChange('A', 'bass', v), 'bg-green-400')}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('HI', eqA.high, (v) => onEqChange('A', 'high', v))}
                  <KillButton active={eqA.high === -1} onClick={() => handleEqKill('A', 'high')} />
                </div>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('MID', eqA.mid, (v) => onEqChange('A', 'mid', v))}
                  <KillButton active={eqA.mid === -1} onClick={() => handleEqKill('A', 'mid')} />
                </div>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('LOW', eqA.low, (v) => onEqChange('A', 'low', v))}
                  <KillButton active={eqA.low === -1} onClick={() => handleEqKill('A', 'low')} />
                </div>
              </>
            )}
          </div>
          <div className="w-px bg-white/5 my-4" />
          <div className="flex flex-col gap-3 flex-1">
            <div className="text-[7px] font-bold text-white/20 uppercase tracking-widest text-center mb-1">Deck B</div>
            {isModernEqMode ? (
              <>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('VOC', stemsB.vocals, (v) => onStemsChange('B', 'vocals', v), 'bg-purple-400')}
                </div>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('DRM', stemsB.drums, (v) => onStemsChange('B', 'drums', v), 'bg-blue-400')}
                </div>
                <div className="flex items-center justify-center gap-3">
                  {renderKnob('BS', stemsB.bass, (v) => onStemsChange('B', 'bass', v), 'bg-green-400')}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3">
                  <KillButton active={eqB.high === -1} onClick={() => handleEqKill('B', 'high')} />
                  {renderKnob('HI', eqB.high, (v) => onEqChange('B', 'high', v))}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <KillButton active={eqB.mid === -1} onClick={() => handleEqKill('B', 'mid')} />
                  {renderKnob('MID', eqB.mid, (v) => onEqChange('B', 'mid', v))}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <KillButton active={eqB.low === -1} onClick={() => handleEqKill('B', 'low')} />
                  {renderKnob('LOW', eqB.low, (v) => onEqChange('B', 'low', v))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Beat FX Section */}
      <div className="bg-black/40 rounded-xl p-3 border border-white/10 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">Beat FX</div>
            <div className="text-[10px] font-mono text-orange-500/80 font-bold">{selectedEffect}</div>
          </div>
          <div className="flex gap-1">
            {['A', 'B', 'MST'].map(target => (
              <button
                key={target}
                onClick={() => setFxAssign(target as any)}
                className={`px-2 py-0.5 rounded text-[7px] font-bold transition-all border ${fxAssign === target ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-white/5 text-white/40 border-white/5'}`}
              >
                {target}
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-24 overflow-y-auto scrollbar-hide bg-black/60 rounded border border-white/5 p-1">
          <div className="grid grid-cols-2 gap-1">
            {AVAILABLE_EFFECTS.map(fx => (
              <button
                key={fx}
                onClick={() => setSelectedEffect(fx)}
                className={`text-left px-2 py-1 rounded text-[7px] font-bold transition-all truncate ${selectedEffect === fx ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-white/20 hover:text-white/40 border border-transparent'}`}
              >
                {fx}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-black/60 p-2 rounded border border-white/5">
            <button 
              onClick={() => {
                const idx = BEATS.indexOf(fxBeat);
                if (idx > 0) setFxBeat(BEATS[idx - 1]);
              }}
              className="text-white/40 hover:text-white p-1 hover:bg-white/5 rounded transition-all"
            >
              <Zap size={12} />
            </button>
            
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-mono text-orange-400 font-bold tracking-tighter">{fxBeat}</div>
              <div className="text-[6px] text-white/20 uppercase font-bold">Beat</div>
            </div>

            <button 
              onClick={() => {
                const idx = BEATS.indexOf(fxBeat);
                if (idx < BEATS.length - 1) setFxBeat(BEATS[idx + 1]);
              }}
              className="text-white/40 hover:text-white p-1 hover:bg-white/5 rounded transition-all"
            >
              <Activity size={12} />
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
            {BEATS.map(b => (
              <button
                key={b}
                onClick={() => setFxBeat(b)}
                className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[6px] font-bold transition-all ${fxBeat === b ? 'bg-orange-500/20 text-orange-400' : 'text-white/10 hover:text-white/30'}`}
              >
                {b}
              </button>
            ))}
          </div>
          
          <div className="flex justify-around items-end pt-2">
            {renderKnob('LEVEL/DEPTH', fxLevel, setFxLevel, 'bg-orange-500')}
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => setIsFxActive(!isFxActive)}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center group transition-all relative ${
                  isFxActive ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'border-orange-500/30 hover:border-orange-500/60'
                }`}
              >
                <div className={`w-10 h-10 rounded-full transition-all ${
                  isFxActive 
                    ? 'bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse scale-105' 
                    : 'bg-orange-900/40 group-hover:bg-orange-900/60'
                }`} />
                {isFxActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-20" />
                )}
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black transition-colors ${
                  isFxActive ? 'bg-dj-accent' : 'bg-white/10'
                }`} />
              </button>
              <span className={`text-[7px] uppercase font-bold transition-colors ${isFxActive ? 'text-orange-400' : 'text-white/40'}`}>
                {isFxActive ? 'ACTIVE' : 'ON/OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Crossfader Curve & Crossfader */}
      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-[7px] font-bold text-white/20 uppercase tracking-widest text-center">Crossfader Curve</div>
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
            {(['linear', 'log', 'exp'] as const).map((c) => (
              <button
                key={c}
                onClick={() => onCurveChange(c)}
                className={`flex-1 py-1 rounded text-[7px] font-bold uppercase transition-all ${curve === c ? 'bg-dj-accent text-black shadow-[0_0_8px_rgba(0,255,255,0.4)]' : 'text-white/40 hover:text-white'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-between w-full text-[8px] text-white/40 font-mono px-2">
            <span>DECK A</span>
            <span>DECK B</span>
          </div>
          <div className="crossfader-track w-full h-8 relative bg-black/60 rounded-lg border border-white/10">
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-8 h-6 bg-white/10 border border-white/20 rounded shadow-lg transition-all"
              style={{ left: `${(crossfader + 1) * 50}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-dj-accent" />
            </div>
            <input 
              type="range" 
              min="-1" 
              max="1" 
              step="0.01"
              value={crossfader}
              onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
