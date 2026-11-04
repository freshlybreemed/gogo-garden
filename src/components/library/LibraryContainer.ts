import { useMemo } from 'react';
import { useAppData } from '../AppData';
import { usePlayerStore } from '@/stores/PlayerStore';
import { useArtistStore } from '@/stores/ArtistStore';
import { useAppStore } from '@/stores/AppStore';
import { useNavbarStore } from '@/stores/NavigationStore';
import { useAlbumStore } from '@/stores/AlbumStore';
import { albumsForArtist } from '@/lib/albums';
import { sample } from '@/lib/helpers';
import type { AlbumModel, ArtistModel, TrackModel } from '@/lib/types';

/**
 * Songs whose title, artist or album contain `filterText`, ordered by track
 * number. (The original concatenated the three matches, so a track matching
 * more than one field showed up -- and was "next" -- more than once.)
 */
export function filterTracks(tracks: TrackModel[], filterText: string): TrackModel[] {
  if (!filterText) return tracks;
  const needle = filterText.toLocaleLowerCase();
  const has = (s: string) => s.toLocaleLowerCase().includes(needle);
  const seen = new Set<string>();
  const out: TrackModel[] = [];
  for (const pick of [
    (t: TrackModel) => has(t.title),
    (t: TrackModel) => has(t.artist),
    (t: TrackModel) => has(t.album),
  ]) {
    for (const t of tracks) {
      if (!seen.has(t.id) && pick(t)) {
        seen.add(t.id);
        out.push(t);
      }
    }
  }
  return out.sort((a, b) => a.trackNumber - b.trackNumber);
}

export function useFilteredTracks(filterText: string) {
  const { tracks } = useAppData();
  return useMemo(() => filterTracks(tracks, filterText), [tracks, filterText]);
}

export function useLibraryContainer(filterText: string) {
  const { tracks, artists, loadError } = useAppData();
  const currentTrackId = usePlayerStore((state) => state.currentTrackId);
  const currentArtist = useArtistStore((state) => state.currentArtist);
  const play = usePlayerStore((state) => state.play);
  const playing = usePlayerStore((state) => state.playing);
  const screen = useAppStore((state) => state.screen);
  const pause = usePlayerStore((state) => state.pause);
  const setScreen = useAppStore((state) => state.setScreen);
  const setCurrentArtist = useArtistStore((state) => state.setCurrentArtist);
  const setCurrentAlbum = useAlbumStore((state) => state.setCurrentAlbum);
  const searchText = useNavbarStore((state) => state.searchText);
  const setSearchText = useNavbarStore((state) => state.setSearchText);

  function onTrackClick(trackId: string) {
    if (playing) {
      pause();
    }
    play(trackId);
  }

  function onArtistClick(inputArtist: ArtistModel) {
    setCurrentArtist(inputArtist);
    setScreen('album');
  }

  function onAlbumClick(inputAlbum: AlbumModel) {
    // Songs screen = global search on the album name (original behavior).
    setSearchText(inputAlbum.name);
    setCurrentAlbum(inputAlbum);
    setScreen('songs');
  }

  function onRandomClick() {
    const track = sample(tracks);
    if (track) {
      play(track.id);
    }
  }

  const filteredTracks = useMemo(() => filterTracks(tracks, filterText), [tracks, filterText]);

  const filteredArtists = useMemo(() => {
    if (!filterText) return artists;
    const needle = filterText.toLocaleLowerCase();
    return artists.filter((artist) => artist.name.toLocaleLowerCase().includes(needle));
  }, [filterText, artists]);

  // Album list isn't filtered by search text (same as before).
  const filteredAlbums = useMemo(
    () => (currentArtist ? albumsForArtist(tracks, currentArtist.id) : []),
    [tracks, currentArtist],
  );

  return {
    currentTrackId,
    currentArtist,
    onTrackClick,
    onRandomClick,
    onArtistClick,
    onAlbumClick,
    filteredTracks,
    filteredAlbums,
    setScreen,
    screen,
    searchText,
    setSearchText,
    filteredArtists,
    activate: loadError ? ('rejected' as const) : ('resolved' as const),
  };
}
