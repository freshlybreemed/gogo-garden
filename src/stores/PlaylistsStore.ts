'use client';

import { create } from 'zustand';
import { supabaseBrowser } from '@/lib/supabase/client';

export type PlaylistSummary = { id: string; name: string; count: number };

type PlaylistsStore = {
  userId: string | null;
  loaded: boolean;
  playlists: PlaylistSummary[];
  load: () => Promise<void>;
  create: (name: string) => Promise<string | null>;
  /** Adds by audio URL (the id shared by the catalog and Supabase `tracks`). */
  addTrack: (playlistId: string, audioUrl: string) => Promise<boolean>;
  reset: () => void;
};

async function trackId(audioUrl: string) {
  const { data } = await supabaseBrowser().from('tracks').select('id').eq('audio_url', audioUrl).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export const usePlaylistsStore = create<PlaylistsStore>((set, get) => ({
  userId: null,
  loaded: false,
  playlists: [],

  async load() {
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      set({ userId: null, playlists: [], loaded: true });
      return;
    }
    const { data } = await supabase
      .from('playlists')
      .select('id, name, playlist_tracks(count)')
      .eq('owner_id', auth.user.id)
      .order('updated_at', { ascending: false });
    const rows = (data ?? []) as unknown as { id: string; name: string; playlist_tracks: { count: number }[] }[];
    set({
      userId: auth.user.id,
      loaded: true,
      playlists: rows.map((r) => ({ id: r.id, name: r.name, count: r.playlist_tracks[0]?.count ?? 0 })),
    });
  },

  async create(name) {
    if (!get().loaded) await get().load();
    const { userId } = get();
    const clean = name.trim().slice(0, 120);
    if (!userId || !clean) return null;
    const { data, error } = await supabaseBrowser()
      .from('playlists')
      .insert({ owner_id: userId, name: clean })
      .select('id, name')
      .single();
    if (error || !data) {
      console.error('[playlists] create', error);
      return null;
    }
    set({ playlists: [{ id: data.id as string, name: data.name as string, count: 0 }, ...get().playlists] });
    return data.id as string;
  },

  async addTrack(playlistId, audioUrl) {
    const id = await trackId(audioUrl);
    if (!id) return false;
    const supabase = supabaseBrowser();
    const pl = get().playlists.find((p) => p.id === playlistId);
    const { error } = await supabase
      .from('playlist_tracks')
      .upsert({ playlist_id: playlistId, track_id: id, position: pl?.count ?? 0 }, { onConflict: 'playlist_id,track_id', ignoreDuplicates: true });
    if (error) {
      console.error('[playlists] add', error);
      return false;
    }
    await supabase.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId);
    set({ playlists: get().playlists.map((p) => (p.id === playlistId ? { ...p, count: p.count + 1 } : p)) });
    return true;
  },

  reset: () => set({ userId: null, loaded: false, playlists: [] }),
}));
