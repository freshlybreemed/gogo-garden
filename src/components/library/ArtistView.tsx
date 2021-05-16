import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styled from 'styled-components'
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { ArtistModel } from '../../stores/ArtistStore';
import { Artist } from './ArtistRow';
import { getArtistName } from '../../lib/helpers';

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
      {numTracks===0 && <div>No results found</div>}
    </div>
  );
}
type ArtistProps = {
  currentArtist?: ArtistModel;
  onArtistClick: (artist: ArtistModel) => void;
  focusArtistId?: string;
  filterText?: string;
};

export function ArtistView({
  onArtistClick,
  currentArtist,
  focusArtistId,
  filterText,
}: ArtistProps) {
  const listRef = useRef<List>(null);

  const beforeListRef = useRef<HTMLDivElement | null>(null);
  const [beforeListHeight, setBeforeListHeight] = useState(-1);
  const isPreContentMeasured = beforeListHeight > 0;


  useLayoutEffect(() => {
    if (beforeListRef.current) {
      const domHeight = beforeListRef.current.getBoundingClientRect()
        .height;
      setBeforeListHeight(domHeight);
    }
  }, [beforeListHeight]);

  useFocusReactWindowItem(listRef, 0);
  console.log(currentArtist, isPreContentMeasured);
  // Render an invisible version of the BeforeList element
  // in order to measure its height and render the right virtualized list
  return !isPreContentMeasured ? (
    <React.Fragment>
      <h2>Artists</h2>
      <div className="opacity-0 border" ref={beforeListRef}>
        <BeforeList numTracks={0}/>
      </div>
    </React.Fragment>
  ) : (
     <React.Fragment>
      <h2>Artists</h2>
      <LibraryContainer className="flex h-full justify-center relative mx-4">
        {!filterText && (
          <div className="absolute border-blue-500 right-0 bottom-0 mb-5 mr-5 z-10">
            {/* <ShuffleButton onClick={onRandomClick} /> */}
          </div>
        )}
        {currentArtist && (
          <div className="flex-auto">
            <AutoSizer>
              {({
                height,
                width,
              }: {
                height: number;
                width: number;
              }) => (
                <React.Fragment>
                  <h2>{getArtistName(currentArtist)}</h2>
                </React.Fragment> )}
            </AutoSizer>
          </div>
        )}
      </LibraryContainer>
    </React.Fragment>
  );
}
