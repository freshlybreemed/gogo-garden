'use client';

import { create } from 'zustand';
import { supabaseBrowser } from '@/lib/supabase/client';

// Likes are keyed by audio URL: it's the stable id shared by the catalog and Supabase `tracks`.
type LikesStore = {
  userId: string | null;
  liked: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (audioUrl: string) => Promise<'ok' | 'login'>;
  reset: () => void;
};

export const useLikesStore = create<LikesStore>((set, get) => ({
  userId: null,
  liked: new Set(),
  loaded: false,

  async load() {
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      set({ userId: null, liked: new Set(), loaded: true });
      return;
    }
    const { data } = await supabase.from('likes').select('tracks(audio_url)').eq('user_id', auth.user.id);
    const rows = (data ?? []) as unknown as { tracks: { audio_url: string } | null }[];
    const urls = rows.map((r) => r.tracks?.audio_url).filter((u): u is string => Boolean(u));
    set({ userId: auth.user.id, liked: new Set(urls), loaded: true });
  },

  async toggle(audioUrl) {
    if (!get().loaded) await get().load();
    const { userId, liked } = get();
    if (!userId) return 'login';
    const supabase = supabaseBrowser();
    const was = liked.has(audioUrl);
    const next = new Set(liked);
    if (was) next.delete(audioUrl);
    else next.add(audioUrl);
    set({ liked: next }); // optimistic

    const { data: track } = await supabase.from('tracks').select('id').eq('audio_url', audioUrl).maybeSingle();
    const { error } = !track
      ? { error: new Error('track not in Supabase') }
      : was
        ? await supabase.from('likes').delete().eq('user_id', userId).eq('track_id', track.id)
        : await supabase.from('likes').insert({ user_id: userId, track_id: track.id });
    if (error) {
      console.error('[likes]', error);
      set({ liked }); // roll back
    }
    return 'ok';
  },

  reset: () => set({ userId: null, liked: new Set(), loaded: false }),
}));
