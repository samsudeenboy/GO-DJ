import { Track } from '../constants';

export interface MidiMapping {
  id: string; // e.g. "cc-7" or "note-60"
  action: string;
  label: string;
  type: 'Toggle' | 'Analog' | 'Trigger';
}

export class MidiService {
  private access: MIDIAccess | null = null;
  private onMessageCallback: ((action: string, value?: number) => void) | null = null;
  private onLearnCallback: ((midiId: string) => void) | null = null;
  private mappings: MidiMapping[] = [
    { id: 'note-60', action: 'PLAY_PAUSE_A', label: 'Deck A Play/Pause', type: 'Toggle' },
    { id: 'note-62', action: 'PLAY_PAUSE_B', label: 'Deck B Play/Pause', type: 'Toggle' },
    { id: 'cc-7', action: 'CROSSFADER', label: 'Crossfader', type: 'Analog' },
    { id: 'cc-10', action: 'VOLUME_A', label: 'Deck A Volume', type: 'Analog' },
    { id: 'cc-11', action: 'VOLUME_B', label: 'Deck B Volume', type: 'Analog' },
  ];

  async initialize() {
    try {
      if (navigator.requestMIDIAccess) {
        this.access = await navigator.requestMIDIAccess();
        this.setupInputs();
        return true;
      }
      return false;
    } catch (e) {
      console.error('MIDI Access failed', e);
      return false;
    }
  }

  private setupInputs() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = (message) => this.handleMidiMessage(message);
    }
  }

  private handleMidiMessage(message: MIDIMessageEvent) {
    const [status, data1, data2] = message.data;
    const command = status & 0xf0;
    
    let midiId = '';
    let value = 0;

    if (command === 0x90 && data2 > 0) {
      midiId = `note-${data1}`;
      value = 1;
    } else if (command === 0x80) {
      midiId = `note-${data1}`;
      value = 0;
    } else if (command === 0xB0) {
      midiId = `cc-${data1}`;
      value = data2 / 127;
    }

    if (!midiId) return;

    if (this.onLearnCallback) {
      this.onLearnCallback(midiId);
      return;
    }

    const mapping = this.mappings.find(m => m.id === midiId);
    if (mapping && this.onMessageCallback) {
      this.onMessageCallback(mapping.action, value);
    }
  }

  setMappings(mappings: MidiMapping[]) {
    this.mappings = mappings;
  }

  getMappings() {
    return this.mappings;
  }

  onMessage(callback: (action: string, value?: number) => void) {
    this.onMessageCallback = callback;
  }

  startLearning(callback: (midiId: string) => void) {
    this.onLearnCallback = callback;
  }

  stopLearning() {
    this.onLearnCallback = null;
  }
}

export const midiService = new MidiService();
