import React, { useState, useRef, useEffect } from 'react';
import { TrackModel } from '../../stores/TracksStore';
import ReactPlayer from 'react-player/file'

export interface MP3PlayerWidgetProps {
  playing?: boolean;
  position?: number;
  player: any;
  volume?: number;
  onReady?: (trackDuration: number) => void;
  onPlayProgressChange?: (position: number) => void;
  onPause?: () => void;
  onPlay?: () => void;
  onPlaying?: ({ position }:{ position: any }) => void;
  onLoading?: ({ bytesLoaded, bytesTotal }:{ bytesLoaded: any, bytesTotal: any }) => void;
  playNextSong:() => void;
  showNative?: boolean;
  track: TrackModel;
}

export function MP3Player(props: MP3PlayerWidgetProps) {
  const {
    onPlayProgressChange,
    onReady,
    track,
    playing,
    player,
    volume = 80,
    showNative,
    playNextSong,
  } = props;

  return (
    <div style={{ transform: showNative ? 'scale(1)' : 'scale(0)' }}>
      <ReactPlayer
        ref={player} 
        onEnded={playNextSong}
        onProgress={({playedSeconds})=>onPlayProgressChange && onPlayProgressChange(playedSeconds)} 
        style={{display:'none'}} 
        url={track.url} 
        onDuration={(duration)=>onReady && onReady(duration)}
        playing={playing} 
      />
    </div>
  );
}
