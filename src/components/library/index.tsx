import { useLibraryContainer } from './LibraryContainer';
import React from 'react';
import { Library } from './SongLibrary';
import { match } from '../../workers/match';
import { ArtistLibrary } from './ArtistLibrary';

type Props = {
  filterText?: string;
};

export default function TrackList({ filterText = '' }: Props) {
  const {
    activate,
    currentTrackId,
    onTrackClick,
    onRandomClick,
    filteredTracks,
    filteredArtists,
    onArtistClick,
    currentArtistId,
  } = useLibraryContainer(filterText);

  return (
    <React.Fragment>
      {match(activate, {
        pending: () => <div>Loading</div>,
        rejected: () => <div>Failure moe</div>,
        resolved: () => (
          <Library
            tracks={filteredTracks}
            onTrackClick={onTrackClick}
            currentTrackId={currentTrackId}
            onRandomClick={onRandomClick}
            filterText={filterText}
          />
          // <ArtistLibrary
          //   artists={filteredArtists}
          //   onArtistClick={onArtistClick}
          //   currentArtistId={currentArtistId}
          //   filterText={filterText}
          // />
        ),
      })}
    </React.Fragment>
  );
}
