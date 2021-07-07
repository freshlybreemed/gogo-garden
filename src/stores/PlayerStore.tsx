import create from 'zustand';
import { clamp } from '../helpers';
import { createApiClient} from '../workers/apiClient';

const apiClient = createApiClient();

type PlayerStatus = 'idle' | 'playing';

export type PlayerStore = {
  playing: boolean;
  volume: number;
  currentTrackId?: string;
  progress: number;
  trackDuration: number;
  cuePosition: number;
  play: (trackId: string) => void;
  pause: () => void;
  resume: () => void;
  setProgress: (progress: number) => void;
  setVolume: (vol: number) => void;
  volumeUp: () => void;
  volumeDown: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  setCuePosition: (curPos: number) => void;
  forward: (secs: number) => void;
  rewind: (secs: number) => void;
  lastVol: number;
  streamUp: (songId: string) => void;
  streamUpState: string;
  setTrackDuration: (duration: number) => void;
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  playing: false,
  volume: 80,
  progress: 0,
  trackDuration: 0,
  lastVol: 80,
  currentTrackId: undefined,
  cuePosition: 0,
  streamUpState: 'resolved',
  play(trackId: string) {
    set({
      playing: true,
      currentTrackId: trackId,
    });
  },
  resume() {
    set({
      playing: true,
    });
  },
  pause() {
    set({
      playing: false,
    });
  },
  streamUp: async(songId: string) =>{
    try {
      set({
        streamUpState: 'pending'
      });
      const streamUp = await apiClient.postStreamUp(songId);
    } catch (err){
        console.log('err in stream up',err);
    }
  },
  setProgress(progress: number) {
    set({
      progress,
    });
  },
  setTrackDuration(duration: number) {
    set({
      trackDuration: duration,
    });
  },
  setCuePosition(cuePos: number) {
    set({
      cuePosition: cuePos,
    });
  },
  forward(secs: number) {
    set({
      cuePosition: get().progress + secs ,
    });
  },
  rewind(secs: number) {
    set({
      cuePosition: get().progress - secs ,
    });
  },
  setVolume(vol: number) {
    set({
      volume: clamp(vol, 0, 100),
    });
  },
  volumeUp() {
    get().setVolume(get().volume + 10);
  },
  volumeDown() {
    get().setVolume(get().volume - 10);
  },
  mute() {
    set({
      lastVol: get().volume,
      volume: 0,
    });
  },
  unmute() {
    set({
      lastVol: 80,
      volume: get().lastVol,
    });
  },
  toggleMute() {
    const muted = playerStoreSelectors.muted(get());
    if (muted) {
      get().unmute();
    } else {
      get().mute();
    }
  },
}));

export type PlayerStoreSelectors = typeof playerStoreSelectors;

export const playerStoreSelectors = {
  muted: (state: PlayerStore) => state.volume <= 0,
  playerState: (state: PlayerStore) => {
    if (!state.playing && state.currentTrackId) {
      return 'paused';
    }
    if (!state.playing && !state.currentTrackId) {
      return 'idle';
    }
    return 'playing';
  },
};
