import * as Tone from 'tone';

class AudioEngine {
  private players: Map<string, Tone.Player> = new Map();
  private filters: Map<string, Tone.Filter> = new Map();
  private volumes: Map<string, Tone.Volume> = new Map();
  private startTimes: Map<string, number> = new Map();
  private offsets: Map<string, number> = new Map();
  private sampler: Tone.Sampler;
  private crossfader: Tone.CrossFade;
  private masterVolume: Tone.Volume;

  constructor() {
    this.masterVolume = new Tone.Volume(0).toDestination();
    this.crossfader = new Tone.CrossFade().connect(this.masterVolume);
    
    this.sampler = new Tone.Sampler({
      urls: {
        A1: "https://tonejs.github.io/audio/casio/A1.mp3",
        A2: "https://tonejs.github.io/audio/casio/A2.mp3",
      },
      release: 1,
    }).connect(this.masterVolume);
  }

  triggerSample(note: string) {
    this.sampler.triggerAttackRelease(note, "8n");
  }

  async loadTrack(deckId: string, url: string) {
    if (this.players.has(deckId)) {
      this.players.get(deckId)?.dispose();
      this.filters.get(deckId)?.dispose();
      this.volumes.get(deckId)?.dispose();
    }

    const volume = new Tone.Volume(0);
    const filter = new Tone.Filter(20000, "lowpass");
    const player = new Tone.Player(url);
    
    player.chain(filter, volume);
    
    if (deckId === 'A') {
      volume.connect(this.crossfader.a);
    } else {
      volume.connect(this.crossfader.b);
    }
    
    player.autostart = false;
    this.players.set(deckId, player);
    this.filters.set(deckId, filter);
    this.volumes.set(deckId, volume);
    this.offsets.set(deckId, 0);
    
    await Tone.loaded();
    return player.buffer.duration;
  }

  play(deckId: string) {
    const player = this.players.get(deckId);
    if (player && player.state !== 'started') {
      const offset = this.offsets.get(deckId) || 0;
      player.start(undefined, offset);
      this.startTimes.set(deckId, Tone.now());
    }
  }

  pause(deckId: string) {
    const player = this.players.get(deckId);
    if (player && player.state === 'started') {
      const elapsed = Tone.now() - (this.startTimes.get(deckId) || Tone.now());
      const currentOffset = (this.offsets.get(deckId) || 0) + elapsed;
      this.offsets.set(deckId, currentOffset);
      player.stop();
    }
  }

  seek(deckId: string, time: number) {
    const player = this.players.get(deckId);
    if (player) {
      const isPlaying = player.state === 'started';
      if (isPlaying) player.stop();
      this.offsets.set(deckId, time);
      if (isPlaying) {
        player.start(undefined, time);
        this.startTimes.set(deckId, Tone.now());
      }
    }
  }

  setVolume(deckId: string, value: number) {
    const db = Tone.gainToDb(value);
    const vol = this.volumes.get(deckId);
    if (vol) vol.volume.value = db;
  }

  setFilter(deckId: string, frequency: number) {
    const filter = this.filters.get(deckId);
    if (filter) filter.frequency.value = frequency;
  }

  setCrossfader(value: number) {
    this.crossfader.fade.value = (value + 1) / 2;
  }

  setLoop(deckId: string, start: number, end: number) {
    const player = this.players.get(deckId);
    if (player) {
      player.loopStart = start;
      player.loopEnd = end;
      player.loop = true;
      
      // If we are already playing, we might need to jump into the loop
      if (player.state === 'started') {
        const currentTime = this.getCurrentTime(deckId);
        if (currentTime < start || currentTime > end) {
          this.seek(deckId, start);
        }
      }
    }
  }

  clearLoop(deckId: string) {
    const player = this.players.get(deckId);
    if (player) {
      player.loop = false;
    }
  }

  setPlaybackRate(deckId: string, rate: number) {
    const player = this.players.get(deckId);
    if (player) {
      player.playbackRate = rate;
    }
  }

  getCurrentTime(deckId: string) {
    const player = this.players.get(deckId);
    if (player && player.state === 'started') {
      const elapsed = (Tone.now() - (this.startTimes.get(deckId) || Tone.now())) * player.playbackRate;
      return (this.offsets.get(deckId) || 0) + elapsed;
    }
    return this.offsets.get(deckId) || 0;
  }

  async start() {
    await Tone.start();
  }
}

export const audioEngine = new AudioEngine();
