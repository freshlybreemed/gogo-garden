import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styled from 'styled-components'
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { ArtistModel } from '../../stores/ArtistStore';
import { Artist } from './rows/artist';
import { TrackModel } from '../../stores/TracksStore';
import { ArtistView } from './ArtistView';
import { useLibraryContainer } from './LibraryContainer';
import { ArtistLibrary } from './ArtistLibrary';
import { SongLibrary } from './SongLibrary';

type BeforeListProps = {
  numTracks: number;
  filterText?: string;
};

const LibraryContainer = styled.div`
background: #FFFFFF0D 0% 0% no-repeat padding-box;
border: 1px solid #FFFFFF26;
border-radius: 20px;
opacity: 1;
`;

function BeforeList({ numTracks, filterText }: BeforeListProps) {
  return (
    <div>
      {numTracks === 0 && <div>No results found</div>}
    </div>
  );
}
type LibraryProps = {
  artists: ArtistModel[];
  currentArtist?: ArtistModel;
  onArtistClick: (artist: ArtistModel) => void;
  focusArtistId?: string;
  filterText?: string;
  screen?: string;
  tracks: TrackModel[];
  currentTrackId?: string;
  onTrackClick: (trackId: string) => void;
  onRandomClick: () => void;
  focusTrackId?: string;
};

export function LibraryContent({
  artists,
  tracks,
  currentArtist,
  currentTrackId,
  onArtistClick,
  onTrackClick,
  focusArtistId,
  screen,
  filterText,
  onRandomClick
}: LibraryProps) {
  const listRef = useRef<List>(null);

  const beforeListRef = useRef<HTMLDivElement | null>(null);
  const [beforeListHeight, setBeforeListHeight] = useState(-1);
  const isPreContentMeasured = beforeListHeight > 0;
  const currentTrackIndex = artists.findIndex(
    (t) => t.id === focusArtistId,
  );


  useLayoutEffect(() => {
    if (beforeListRef.current) {
      const domHeight = beforeListRef.current.getBoundingClientRect()
        .height;
      setBeforeListHeight(domHeight);
    }
  }, [beforeListHeight]);

  useFocusReactWindowItem(listRef, currentTrackIndex);
  console.log(artists, currentArtist, isPreContentMeasured);
  // Render an invisible version of the BeforeList element
  // in order to measure its height and render the right virtualized list
  return !isPreContentMeasured ? (
    <React.Fragment>
      <h2>Artists</h2>
      <div className="opacity-0 border" ref={beforeListRef}>
        <BeforeList numTracks={artists.length} />
      </div>
    </React.Fragment>
  ) :
    (<React.Fragment>
      { screen === 'artist' ?
        <ArtistView
          onArtistClick={onArtistClick}
          filterText={filterText}
        // currentArtist={currentArtist}
        />
        // <SongLibrary 
        //   tracks={tracks}
        //   onTrackClick={onTrackClick}
        //   currentTrackId={currentTrackId}
        //   filterText={filterText}
        //   onRandomClick={onRandomClick}
        // />
        :
        <ArtistLibrary
          artists={artists}
          onArtistClick={onArtistClick}
          filterText={filterText}
        />}
    </React.Fragment>
    );
}
