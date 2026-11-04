import type { AlbumModel, TrackModel } from './types';

/**
 * Same grouping the old `albums(artistId)` resolver did: first song seen for
 * each album name wins. Done client-side now since all songs are already
 * loaded, which saves a round trip per artist click.
 */
export function albumsForArtist(
  tracks: TrackModel[],
  artistId: string,
): AlbumModel[] {
  const albums = new Map<string, AlbumModel>();
  for (const song of tracks) {
    if (song.artistId !== artistId || albums.has(song.album)) continue;
    albums.set(song.album, {
      name: song.album,
      artist: song.artist,
      artistId: song.artistId,
      imageUrl: song.imageUrl,
    });
  }
  return [...albums.values()];
}
