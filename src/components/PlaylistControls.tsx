'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { usePlaylistsStore } from '@/stores/PlaylistsStore';

export function NewPlaylistForm() {
  const router = useRouter();
  const create = usePlaylistsStore((s) => s.create);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const id = await create(name);
        setBusy(false);
        if (id) router.push(`/playlists/${id}`);
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        placeholder="Name a new playlist"
        aria-label="New playlist name"
        maxLength={120}
        className="h-12 min-w-0 flex-1 border-b-2 border-rule bg-transparent text-[17px] outline-none focus:border-crank"
      />
      <button type="submit" disabled={busy || !name.trim()} className="h-12 bg-crank px-5 font-bold text-ink disabled:opacity-50">
        Make
      </button>
    </form>
  );
}

export function PlaylistActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const reset = usePlaylistsStore((s) => s.reset);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [confirming, setConfirming] = useState(false);
  const supabase = supabaseBrowser();

  if (editing) {
    return (
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const clean = value.trim().slice(0, 120);
          if (clean) await supabase.from('playlists').update({ name: clean, updated_at: new Date().toISOString() }).eq('id', id);
          reset();
          setEditing(false);
          router.refresh();
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          aria-label="Playlist name"
          maxLength={120}
          autoFocus
          className="h-10 border-b-2 border-rule bg-transparent text-[16px] outline-none focus:border-crank"
        />
        <button type="submit" className="h-10 px-3 text-[14px] font-semibold text-paper">Save</button>
      </form>
    );
  }
  return (
    <span className="flex items-center gap-4 text-[14px] font-semibold text-dust">
      <button type="button" onClick={() => setEditing(true)} className="hover:text-paper">Rename</button>
      {confirming ? (
        <span className="flex items-center gap-3">
          <span className="text-paper">Delete this playlist?</span>
          <button
            type="button"
            onClick={async () => {
              await supabase.from('playlists').delete().eq('id', id);
              reset();
              router.push('/playlists');
              router.refresh();
            }}
            className="text-crank"
          >
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="hover:text-paper">Keep</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="hover:text-paper">Delete</button>
      )}
    </span>
  );
}

export function RemoveFromPlaylist({ playlistId, audioUrl }: { playlistId: string; audioUrl: string }) {
  const router = useRouter();
  const reset = usePlaylistsStore((s) => s.reset);
  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = supabaseBrowser();
        const { data } = await supabase.from('tracks').select('id').eq('audio_url', audioUrl).maybeSingle();
        if (data) await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId).eq('track_id', data.id);
        reset();
        router.refresh();
      }}
      className="shrink-0 px-2 text-[13px] font-semibold text-dust hover:text-crank"
    >
      Remove
    </button>
  );
}
