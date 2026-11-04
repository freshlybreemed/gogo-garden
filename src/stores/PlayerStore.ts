import { create } from 'zustand';
import { clamp } from '@/lib/helpers';
import { streamUp as streamUpAction } from '@/app/actions';
import type { TrackModel } from '@/lib/types';

export type PlayerStore = {
  playing: boolean;
  volume: number;
  /** The list playback came from; "next" walks it. */
  queue: TrackModel[];
  index: number;
  /** Where the queue came from, e.g. a show or band name. */
  queueSource?: string;
  currentTrack?: TrackModel;
  progress: number;
  trackDuration: number;
  /** Seek requests; `nonce` lets the same position be requested twice. */
  cue: { position: number; nonce: number };
  lastVol: number;
  queueOpen: boolean;
  /** Track id the current play has already been counted for. */
  streamedTrackId?: string;
  streamUpState: 'pending' | 'resolved' | 'rejected';
  /** Play `tracks` starting at `index`; the list becomes the queue. */
  playList: (tracks: TrackModel[], index?: number, source?: string) => void;
  /** Play/pause the given track, starting it (with `list` as the queue) if needed. */
  toggleTrack: (track: TrackModel, list: TrackModel[], source?: string) => void;
  jumpTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  setProgress: (progress: number) => void;
  setVolume: (vol: number) => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  seek: (position: number) => void;
  forward: (secs: number) => void;
  rewind: (secs: number) => void;
  streamUp: (songId: string) => Promise<void>;
  setTrackDuration: (duration: number) => void;
  setQueueOpen: (open: boolean) => void;
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  playing: false,
  volume: 80,
  queue: [],
  index: -1,
  progress: 0,
  trackDuration: 0,
  lastVol: 80,
  cue: { position: 0, nonce: 0 },
  queueOpen: false,
  streamUpState: 'resolved',
  playList(tracks, index = 0, source) {
    const track = tracks[index];
    if (!track) return;
    // Each start is a new listen and may be counted again.
    set({
      queue: tracks,
      index,
      queueSource: source,
      currentTrack: track,
      playing: true,
      progress: 0,
      streamedTrackId: undefined,
    });
  },
  toggleTrack(track, list, source) {
    const { currentTrack, playing } = get();
    if (currentTrack?.id === track.id) {
      set({ playing: !playing });
      return;
    }
    const index = list.findIndex((t) => t.id === track.id);
    get().playList(index >= 0 ? list : [track], Math.max(index, 0), source);
  },
  jumpTo(index) {
    const { queue, queueSource } = get();
    get().playList(queue, index, queueSource);
  },
  next() {
    const { queue, index } = get();
    if (index + 1 < queue.length) get().jumpTo(index + 1);
    else set({ playing: false });
  },
  previous() {
    const { index, progress } = get();
    if (progress > 3 || index <= 0) get().seek(0);
    else get().jumpTo(index - 1);
  },
  resume() {
    if (get().currentTrack) set({ playing: true });
  },
  pause() {
    set({ playing: false });
  },
  toggle() {
    if (get().playing) get().pause();
    else get().resume();
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
  seek(position) {
    const max = get().trackDuration || Infinity;
    const p = clamp(position, 0, max);
    set({ cue: { position: p, nonce: get().cue.nonce + 1 }, progress: p });
  },
  forward(secs) {
    get().seek(get().progress + secs);
  },
  rewind(secs) {
    get().seek(get().progress - secs);
  },
  setVolume(vol) {
    set({ volume: clamp(vol, 0, 100) });
  },
  mute() {
    set({ lastVol: get().volume || 80, volume: 0 });
  },
  unmute() {
    set({ volume: get().lastVol || 80 });
  },
  toggleMute() {
    if (playerStoreSelectors.muted(get())) get().unmute();
    else get().mute();
  },
  setQueueOpen(open) {
    set({ queueOpen: open });
  },
}));

export const playerStoreSelectors = {
  muted: (state: PlayerStore) => state.volume <= 0,
  playerState: (state: PlayerStore) => {
    if (!state.playing && state.currentTrack) return 'paused';
    if (!state.playing && !state.currentTrack) return 'idle';
    return 'playing';
  },
};
