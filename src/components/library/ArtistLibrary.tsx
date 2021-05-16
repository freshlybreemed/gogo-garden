import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styled from 'styled-components'
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { ArtistModel } from '../../stores/ArtistStore';
import { Artist } from './ArtistRow';

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
  artists: ArtistModel[];
  currentArtist?: ArtistModel;
  onArtistClick: (artist: ArtistModel) => void;
  focusArtistId?: string;
  filterText?: string;
};

export function ArtistLibrary({
  artists,
  currentArtist,
  onArtistClick,
  focusArtistId,
  filterText,
}: ArtistProps) {
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
  console.log(artists, isPreContentMeasured);
  // Render an invisible version of the BeforeList element
  // in order to measure its height and render the right virtualized list
  return (
    <React.Fragment>
      <h2>Artists</h2>
      <LibraryContainer className="flex h-full justify-center relative mx-4">
        {!filterText && (
          <div className="absolute border-blue-500 right-0 bottom-0 mb-5 mr-5 z-10">
            {/* <ShuffleButton onClick={onRandomClick} /> */}
          </div>
        )}
        {artists.length > 0 && (
          <div className="flex-auto">
            <AutoSizer>
              {({
                height,
                width,
              }: {
                height: number;
                width: number;
              }) => (
                <List
                  ref={listRef}
                  className="px-4 md:px-4"
                  itemCount={artists.length}
                  itemSize={90}
                  width={width}
                  height={height}
                  key={beforeListHeight}
                >
                  {({ index, style }: any) => {
                    const artist: ArtistModel = artists[index];
                    const top = style.top;
                    const fHeight =
                      parseFloat(style.height) + beforeListHeight;
                    return (
                      <div
                        className="w-full"
                        style={{
                          ...style,
                          ...(index !== 0 && {
                            top: `${
                              parseFloat(top) + beforeListHeight
                            }px`,
                          }),
                          ...(index === 0 && { height: fHeight }),
                        }}
                      >
                        <div className="max-w-4xl m-auto">
                          {index === 0 && (
                            <div>
                              <BeforeList
                                filterText={filterText}
                                numTracks={artists.length}
                              />
                            </div>
                          )}
                          <Artist
                            onClick={() => {
                              console.log('artist',artist); 
                              onArtistClick(artist);
                            }}
                            artist={artist}
                            selected={artist.id === currentArtist?.id}
                          />
                        </div>
                      </div>
                    );
                  }}
                </List>
              )}
            </AutoSizer>
          </div>
        )}
      </LibraryContainer>
    </React.Fragment>
  );
}
