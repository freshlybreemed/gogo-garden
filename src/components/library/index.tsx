'use client';

import { useLibraryContainer } from './LibraryContainer';
import { match } from '@/lib/match';
import { LibraryContent } from './LibraryContent';

type Props = {
  filterText?: string;
};

export default function TrackList({ filterText = '' }: Props) {
  const {
    activate,
    currentTrackId,
    onTrackClick,
    onRandomClick,
    onAlbumClick,
    filteredTracks,
    filteredAlbums,
    filteredArtists,
    onArtistClick,
    screen,
  } = useLibraryContainer(filterText);

  return match(activate, {
    // Initial load is server-side now; app/loading.tsx renders "Loading".
    rejected: () => <div>Failure moe</div>,
    resolved: () => (
      <LibraryContent
        tracks={filteredTracks}
        artists={filteredArtists}
        screen={screen}
        albums={filteredAlbums}
        onAlbumClick={onAlbumClick}
        onArtistClick={onArtistClick}
        onTrackClick={onTrackClick}
        currentTrackId={currentTrackId}
        onRandomClick={onRandomClick}
        filterText={filterText}
      />
    ),
  });
}
