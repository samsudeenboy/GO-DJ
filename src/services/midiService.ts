import { Track } from '../constants';

export interface MidiMapping {
  [key: string]: {
    action: string;
    params?: any;
  };
}

export class MidiService {
  private access: MIDIAccess | null = null;
  private onMessageCallback: ((action: string, params?: any) => void) | null = null;

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
    const channel = status & 0x0f;

    // Basic mapping logic (can be expanded)
    // Note On: 0x90, CC: 0xB0
    if (command === 0x90 && data2 > 0) {
      // Button press
      this.triggerAction('button', data1);
    } else if (command === 0xB0) {
      // Knob/Fader move
      this.triggerAction('cc', data1, data2 / 127);
    }
  }

  private triggerAction(type: string, id: number, value?: number) {
    if (!this.onMessageCallback) return;

    // Example mappings for a generic controller
    if (type === 'button') {
      if (id === 60) this.onMessageCallback('PLAY_PAUSE_A');
      if (id === 62) this.onMessageCallback('PLAY_PAUSE_B');
      if (id === 64) this.onMessageCallback('CUE_A');
      if (id === 65) this.onMessageCallback('CUE_B');
    } else if (type === 'cc') {
      if (id === 7) this.onMessageCallback('CROSSFADER', value);
      if (id === 10) this.onMessageCallback('VOLUME_A', value);
      if (id === 11) this.onMessageCallback('VOLUME_B', value);
    }
  }

  onMessage(callback: (action: string, params?: any) => void) {
    this.onMessageCallback = callback;
  }
}

export const midiService = new MidiService();
