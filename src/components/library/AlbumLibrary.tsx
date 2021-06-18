import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styled from 'styled-components'
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { ArtistModel } from '../../stores/ArtistStore';
import { Artist } from './rows/artist';
import { AlbumModel } from '../../stores/AlbumStore';
import { Album } from './rows/album';

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
type AlbumProps = {
  albums: AlbumModel[];
  currentAlbum?: AlbumModel;
  onAlbumClick: (albums: AlbumModel) => void;
  focusArtistId?: string;
  filterText?: string;
};

export function AlbumLibrary({
  albums,
  currentAlbum,
  onAlbumClick,
  focusArtistId,
  filterText,
}: AlbumProps) {
  const listRef = useRef<List>(null);

  const beforeListRef = useRef<HTMLDivElement | null>(null);
  const [beforeListHeight, setBeforeListHeight] = useState(-1);
  const isPreContentMeasured = beforeListHeight > 0;
  const currentAlbumIndex = albums.findIndex(
    (t) => t.artistId === focusArtistId,
  );

  useLayoutEffect(() => {
    if (beforeListRef.current) {
      const domHeight = beforeListRef.current.getBoundingClientRect()
        .height;
      setBeforeListHeight(domHeight);
    }
  }, [beforeListHeight]);

  useFocusReactWindowItem(listRef, currentAlbumIndex);
  console.log(albums, isPreContentMeasured);
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
        {albums.length > 0 && (
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
                  itemCount={albums.length}
                  itemSize={90}
                  width={width}
                  height={height}
                  key={beforeListHeight}
                >
                  {({ index, style }: any) => {
                    const album: AlbumModel = albums[index];
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
                                numTracks={albums.length}
                              />
                            </div>
                          )}
                          <Album
                            onClick={() => {
                              console.log('albums',albums); 
                              onAlbumClick(album);
                            }}
                            album={album}
                            selected={album.name === currentAlbum?.name}
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
