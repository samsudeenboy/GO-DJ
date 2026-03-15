import React from 'react';
import { X, Volume2, Monitor, Cpu, Keyboard, Sliders, Shield, Zap, Plus, Trash2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { midiService } from '../services/midiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onUpdateSetting: (key: string, value: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSetting }) => {
  const [activeSection, setActiveSection] = React.useState('audio');
  const [isMapping, setIsMapping] = React.useState(false);
  const [mappingAction, setMappingAction] = React.useState<string | null>(null);

  const startMidiLearn = (action: string, label: string, type: 'Toggle' | 'Analog') => {
    setIsMapping(true);
    setMappingAction(action);
    midiService.startLearning((midiId) => {
      const newMapping = { id: midiId, action, label, type };
      const existingMappings = settings.midiMappings || [];
      const filteredMappings = existingMappings.filter((m: any) => m.action !== action && m.id !== midiId);
      onUpdateSetting('midiMappings', [...filteredMappings, newMapping]);
      stopMidiLearn();
    });
  };

  const stopMidiLearn = () => {
    setIsMapping(false);
    setMappingAction(null);
    midiService.stopLearning();
  };

  if (!isOpen) return null;

  const sections = [
    { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> },
    { id: 'display', label: 'Display', icon: <Monitor size={16} /> },
    { id: 'midi', label: 'MIDI', icon: <Keyboard size={16} /> },
    { id: 'performance', label: 'Performance', icon: <Cpu size={16} /> },
    { id: 'mixer', label: 'Mixer', icon: <Sliders size={16} /> },
    { id: 'ai', label: 'AI Engine', icon: <Zap size={16} /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-dj-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex h-[500px]"
        >
          {/* Sidebar */}
          <div className="w-48 bg-black/40 border-r border-white/5 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-dj-accent mb-6 px-2">
              <Shield size={20} />
              <span className="font-black text-xs uppercase tracking-widest">Settings</span>
            </div>
            
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSection === s.id ? 'bg-dj-accent text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <header className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{activeSection} Configuration</h3>
              <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeSection === 'audio' && (
                <div className="space-y-4">
                  <SettingToggle 
                    label="Master Limiter" 
                    description="Prevents audio clipping at high volumes" 
                    active={settings.masterLimiter} 
                    onToggle={() => onUpdateSetting('masterLimiter', !settings.masterLimiter)} 
                  />
                  <SettingToggle 
                    label="High Quality Audio" 
                    description="Enable 48kHz / 24-bit processing" 
                    active={settings.highQualityAudio} 
                    onToggle={() => onUpdateSetting('highQualityAudio', !settings.highQualityAudio)} 
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Buffer Size</label>
                    <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 outline-none">
                      <option>128 samples (Ultra Low Latency)</option>
                      <option>256 samples (Balanced)</option>
                      <option>512 samples (Stable)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSection === 'midi' && (
                <div className="space-y-6">
                  <div className="bg-dj-accent/10 border border-dj-accent/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Keyboard className="text-dj-accent" />
                      <div>
                        <p className="text-xs font-bold text-white">MIDI Controller Support</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-tighter">Web MIDI API Status: Active</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-dj-accent text-black text-[10px] font-black rounded uppercase hover:scale-105 transition-transform">Rescan</button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Mappings</p>
                      <div className="flex gap-2">
                        {isMapping && (
                          <motion.div 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="flex items-center gap-2 px-2 py-1 bg-red-500/20 border border-red-500/40 rounded text-[9px] font-black text-red-500 uppercase"
                          >
                            Learning: {mappingAction}
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                      {settings.midiMappings.length > 0 ? (
                        settings.midiMappings.map((mapping: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl group hover:border-dj-accent/30 transition-all">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-white/80">{mapping.label}</span>
                              <span className="text-[8px] text-white/30 uppercase tracking-widest">{mapping.type}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[9px] font-mono text-dj-accent">
                                {mapping.id.toUpperCase()}
                              </div>
                              <button 
                                onClick={() => {
                                  const newMappings = settings.midiMappings.filter((_: any, idx: number) => idx !== i);
                                  onUpdateSetting('midiMappings', newMappings);
                                }}
                                className="text-white/20 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 opacity-20">
                          <Keyboard size={24} />
                          <span className="text-[10px] font-black uppercase tracking-widest">No Mappings Found</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 bg-dj-accent/5 border border-dashed border-dj-accent/20 rounded-xl flex flex-col items-center justify-center gap-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dj-accent/20 to-transparent" />
                    <Settings2 size={24} className="text-dj-accent/40" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-white">Interactive MIDI Learn</p>
                      <p className="text-[9px] text-white/40 uppercase leading-tight tracking-widest">Map your hardware controls to GO DJ actions</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 w-full mt-2">
                      {[
                        { action: 'PLAY_PAUSE_A', label: 'Deck A Play', type: 'Toggle' },
                        { action: 'PLAY_PAUSE_B', label: 'Deck B Play', type: 'Toggle' },
                        { action: 'CROSSFADER', label: 'Crossfader', type: 'Analog' },
                        { action: 'VOLUME_A', label: 'Deck A Volume', type: 'Analog' },
                        { action: 'VOLUME_B', label: 'Deck B Volume', type: 'Analog' },
                        { action: 'EQ_LOW_A', label: 'Deck A Low', type: 'Analog' },
                        { action: 'EQ_MID_A', label: 'Deck A Mid', type: 'Analog' },
                        { action: 'EQ_HIGH_A', label: 'Deck A High', type: 'Analog' },
                      ].map((item) => (
                        <button
                          key={item.action}
                          onClick={() => startMidiLearn(item.action, item.label, item.type as any)}
                          className={`px-3 py-2 border rounded-lg text-[9px] font-black uppercase transition-all ${mappingAction === item.action ? 'bg-dj-accent text-black border-dj-accent shadow-[0_0_15px_rgba(0,255,157,0.4)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-dj-accent/50'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {isMapping && (
                      <motion.button 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={stopMidiLearn}
                        className="mt-2 w-full py-2 bg-red-500/20 border border-red-500 text-red-500 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                      >
                        Cancel Mapping
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'ai' && (
                <div className="space-y-4">
                  <SettingToggle 
                    label="Real-time Stem Analysis" 
                    description="Analyze tracks for stems immediately on load" 
                    active={settings.autoStemAnalysis} 
                    onToggle={() => onUpdateSetting('autoStemAnalysis', !settings.autoStemAnalysis)} 
                  />
                  <SettingToggle 
                    label="AI Transition Suggestions" 
                    description="Show floating advice for track transitions" 
                    active={settings.showAiAdvice} 
                    onToggle={() => onUpdateSetting('showAiAdvice', !settings.showAiAdvice)} 
                  />
                </div>
              )}
            </div>

            <footer className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-dj-accent text-black text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-dj-accent/20 hover:scale-105 transition-transform"
              >
                Save Changes
              </button>
            </footer>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const SettingToggle = ({ label, description, active, onToggle }: any) => (
  <div className="flex items-center justify-between group">
    <div className="flex-1">
      <p className="text-xs font-bold text-white group-hover:text-dj-accent transition-colors">{label}</p>
      <p className="text-[10px] text-white/40 leading-tight">{description}</p>
    </div>
    <button 
      onClick={onToggle}
      className={`w-10 h-5 rounded-full relative transition-colors ${active ? 'bg-dj-accent' : 'bg-white/10'}`}
    >
      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);
