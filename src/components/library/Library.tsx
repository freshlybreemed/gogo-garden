import React, { useRef, useState, useLayoutEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Track } from '../track';
import useFocusReactWindowItem from './useFocusReactWindowItem';
import { TrackModel } from '../../stores/TracksStore';

type BeforeListProps = {
  numTracks: number;
  filterText?: string;
};

function BeforeList({ numTracks, filterText }: BeforeListProps) {
  return (
    <div>
      <div>
        {filterText ? `Songs matching ${filterText}` : `All songs`}
      </div>
      <div>{numTracks} total</div>
    </div>
  );
}
type TrackProps = {
  tracks: TrackModel[];
  currentTrackId?: string;
  onTrackClick: (trackId: string) => void;
  onRandomClick: () => void;
  focusTrackId?: string;
  filterText?: string;
};

export function Library({
  tracks,
  onTrackClick,
  currentTrackId,
  onRandomClick,
  focusTrackId,
  filterText,
}: TrackProps) {
  const listRef = useRef<List>(null);

  const beforeListRef = useRef<HTMLDivElement | null>(null);
  const [beforeListHeight, setBeforeListHeight] = useState(-1);
  const isPreContentMeasured = beforeListHeight > 0;
  const currentTrackIndex = tracks.findIndex(
    (t) => t.id === focusTrackId,
  );

  useLayoutEffect(() => {
    if (beforeListRef.current) {
      const domHeight = beforeListRef.current.getBoundingClientRect()
        .height;
      setBeforeListHeight(domHeight);
    }
  }, [beforeListHeight]);

  useFocusReactWindowItem(listRef, currentTrackIndex);
  console.log(tracks, isPreContentMeasured);
  // Render an invisible version of the BeforeList element
  // in order to measure its height and render the right virtualized list
  return !isPreContentMeasured ? (
    <div className="opacity-0 border" ref={beforeListRef}>
      <BeforeList numTracks={tracks.length} />
    </div>
  ) : (
    <div className="flex h-full justify-center relative">
      {!filterText && (
        <div className="absolute border-blue-500 right-0 bottom-0 mb-5 mr-5 z-10">
          {/* <ShuffleButton onClick={onRandomClick} /> */}
        </div>
      )}
      {tracks.length > 0 && (
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
                itemCount={tracks.length}
                itemSize={90}
                width={width}
                height={height}
                key={beforeListHeight}
              >
                {({ index, style }: any) => {
                  const track = tracks[index];
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
                              numTracks={tracks.length}
                            />
                          </div>
                        )}
                        <Track
                          onClick={() => onTrackClick(track.id)}
                          track={track}
                          playing={track.id === currentTrackId}
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
