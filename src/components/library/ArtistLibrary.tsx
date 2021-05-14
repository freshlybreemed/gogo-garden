import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { ArtistModel } from '../../stores/ArtistStore';
import { Artist } from './Artist';

type BeforeListProps = {
  numTracks: number;
  filterText?: string;
};

function BeforeList({ numTracks, filterText }: BeforeListProps) {
  return (
    <div>
      <div>
        {/* {filterText ? `Songs matching ${filterText}` : `All songs`} */}
      </div>
      {/* <div>{numTracks} total</div> */}
    </div>
  );
}
type ArtistProps = {
  artists: ArtistModel[];
  currentArtistId?: string;
  onArtistClick: (trackId: string) => void;
  focusArtistId?: string;
  filterText?: string;
};

export function ArtistLibrary({
  artists,
  currentArtistId,
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
  return !isPreContentMeasured ? (
    <div className="opacity-0 border" ref={beforeListRef}>
      <BeforeList numTracks={artists.length} />
    </div>
  ) : (
    <div className="flex h-full justify-center relative">
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
                          onClick={() => onArtistClick(artist.id)}
                          artist={artist}
                          selected={artist.id === currentArtistId}
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
    </div>
  );
}
