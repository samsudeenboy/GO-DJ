export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  cover?: string;
}

export const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Neon Nights',
    artist: 'Synthwave Collective',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372,
    cover: 'https://picsum.photos/seed/neon/200/200'
  },
  {
    id: '2',
    title: 'Midnight Drive',
    artist: 'Retro Runner',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 425,
    cover: 'https://picsum.photos/seed/drive/200/200'
  },
  {
    id: '3',
    title: 'Digital Horizon',
    artist: 'Cyber Pulse',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 315,
    cover: 'https://picsum.photos/seed/horizon/200/200'
  },
  {
    id: '4',
    title: 'Electric Dreams',
    artist: 'Voltage',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: 380,
    cover: 'https://picsum.photos/seed/dreams/200/200'
  }
];
