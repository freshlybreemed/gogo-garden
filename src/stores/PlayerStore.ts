import { create } from 'zustand';
import { clamp } from '@/lib/helpers';
import { streamUp as streamUpAction } from '@/app/actions';

export type PlayerStore = {
  playing: boolean;
  volume: number;
  currentTrackId?: string;
  progress: number;
  trackDuration: number;
  cuePosition: number;
  lastVol: number;
  /** Track id the current play has already been counted for. */
  streamedTrackId?: string;
  streamUpState: 'pending' | 'resolved' | 'rejected';
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
  streamUp: (songId: string) => Promise<void>;
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
  play(trackId) {
    // Each play() is a new listen and may be counted again.
    set({ playing: true, currentTrackId: trackId, streamedTrackId: undefined });
  },
  resume() {
    set({ playing: true });
  },
  pause() {
    set({ playing: false });
  },
  async streamUp(songId) {
    if (get().streamedTrackId === songId) return;
    set({ streamUpState: 'pending', streamedTrackId: songId });
    try {
      await streamUpAction(songId);
      set({ streamUpState: 'resolved' });
    } catch (err) {
      console.log('err in stream up', err);
      set({ streamUpState: 'rejected' });
    }
  },
  setProgress(progress) {
    set({ progress });
  },
  setTrackDuration(duration) {
    set({ trackDuration: duration });
  },
  setCuePosition(cuePos) {
    set({ cuePosition: cuePos });
  },
  forward(secs) {
    set({ cuePosition: get().progress + secs });
  },
  rewind(secs) {
    set({ cuePosition: get().progress - secs });
  },
  setVolume(vol) {
    set({ volume: clamp(vol, 0, 100) });
  },
  volumeUp() {
    get().setVolume(get().volume + 10);
  },
  volumeDown() {
    get().setVolume(get().volume - 10);
  },
  mute() {
    set({ lastVol: get().volume, volume: 0 });
  },
  unmute() {
    set({ lastVol: 80, volume: get().lastVol });
  },
  toggleMute() {
    if (playerStoreSelectors.muted(get())) {
      get().unmute();
    } else {
      get().mute();
    }
  },
}));

export const playerStoreSelectors = {
  muted: (state: PlayerStore) => state.volume <= 0,
  playerState: (state: PlayerStore) => {
    if (!state.playing && state.currentTrackId) return 'paused';
    if (!state.playing && !state.currentTrackId) return 'idle';
    return 'playing';
  },
};
