import { useLibraryContainer } from './LibraryContainer';
import React from 'react';
import { match } from '../../workers/match';
import { LibraryContent } from './LibraryContent';
import { ArtistView } from './ArtistView';

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
    currentArtist,
  } = useLibraryContainer(filterText);

  return (
    <React.Fragment>
      {match(activate, {
        pending: () => <div>Loading</div>,
        rejected: () => <div>Failure moe</div>,
        resolved: () => <LibraryContent
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
      })
    }
    </React.Fragment>
  );
}
