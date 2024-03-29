import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styled from 'styled-components'
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { ArtistModel } from '../../stores/ArtistStore';
import { TrackModel } from '../../stores/TracksStore';
import { ArtistLibrary } from './ArtistLibrary';
import { SongLibrary } from './SongLibrary';
import { AlbumLibrary } from './AlbumLibrary';
import { AlbumModel } from '../../stores/AlbumStore';

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
  albums: AlbumModel[];
  currentArtist?: ArtistModel;
  onArtistClick: (artist: ArtistModel) => void;
  onAlbumClick: (album: AlbumModel) => void;
  focusArtistId?: string;
  filterText?: string;
  screen?: string;
  tracks: TrackModel[];
  currentTrackId?: string;
  currentAlbumId?: string;
  onTrackClick: (trackId: string) => void;
  onRandomClick: () => void;
  focusTrackId?: string;
};

export function LibraryContent({
  artists,
  tracks,
  albums,
  onAlbumClick,
  currentArtist,
  currentTrackId,
  currentAlbumId,
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
      {screen === 'album' && ( <AlbumLibrary 
          albums={albums}
          onAlbumClick={onAlbumClick}
          // currentAlbumId={currentAlbumId}
          filterText={filterText}
          // onRandomClick={onRandomClick}
        />)}

      { screen === 'home' &&
        <ArtistLibrary
        artists={artists}
        onArtistClick={onArtistClick}
        filterText={filterText}
        />}
        {screen === 'songs' && (
        <SongLibrary 
          tracks={tracks}
          onTrackClick={onTrackClick}
          currentTrackId={currentTrackId}
          filterText={filterText}
          onRandomClick={onRandomClick}
        />
        )}
        {/* // <ArtistView
        //   albums={albums}
        //   onArtistClick={onArtistClick}
        //   filterText={filterText}
        // />
        <AlbumLibrary 
          albums={albums}
          onAlbumClick={onAlbumClick}
          // currentAlbumId={currentAlbumId}
          filterText={filterText}
          // onRandomClick={onRandomClick}
        />
        : */}
    </React.Fragment>
    );
}
