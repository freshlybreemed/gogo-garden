import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { Helmet } from 'react-helmet';
import {
  PlayerStore,
  usePlayerStore,
  playerStoreSelectors,
} from '../../stores/PlayerStore';
import { TrackModel, useTracksStore } from '../../stores/TracksStore';
import shallow from 'zustand/shallow';
import { cx } from '@emotion/css';
import { Slider } from '@reach/slider';

import { formatDate, formatTime } from '../../helpers';
import {
  IconBackThirty,
  IconPause,
  IconPlay,
  IconSkipThirty,
  IconSoundcloud,
  IconSpeaker,
} from '../icons';
import { useMedia } from '../../workers/useMedia';
import { MP3Player } from './player';
import { useLibraryContainer } from '../library/LibraryContainer';
import { usePlayerContainer } from './PlayerContainer';

type Props = {
  filterText?: string;
};

type PlayerRef = {
  seekTo: (position: number) => void;
}

export default function Player({ filterText = '' }: Props) {
  const playerSelectors = (state: PlayerStore) => ({
    playing: state.playing,
    volume: state.volume,
    currentTrackId: state.currentTrackId,
    progress: state.progress,
    trackDuration: state.trackDuration,
    cuePosition: state.cuePosition,
    play: state.play,
    pause: state.pause,
    resume: state.resume,
    setProgress: state.setProgress,
    setVolume: state.setVolume,
    volumeUp: state.volumeUp,
    volumeDown: state.volumeDown,
    mute: state.mute,
    muted: playerStoreSelectors.muted(state),
    unmute: state.unmute,
    toggleMute: state.toggleMute,
    setCuePosition: state.setCuePosition,
    forward: state.forward,
    rewind: state.rewind,
    lastVol: state.lastVol,
    setTrackDuration: state.setTrackDuration,
  });

  const {
    playing,
    volume,
    currentTrackId,
    progress,
    trackDuration,
    cuePosition,
    play,
    pause,
    resume,
    setProgress,
    setVolume,
    volumeUp,
    volumeDown,
    mute,
    unmute,
    muted,
    toggleMute,
    setCuePosition,
    forward,
    rewind,
    lastVol,
    setTrackDuration,
  } = usePlayerStore(playerSelectors, shallow);
  const {
    playNextSong
  } = usePlayerContainer(filterText);

  const tracks = useTracksStore((state) => state.tracks);
  const fetchTracksState = useTracksStore(
    (state) => state.fetchTracksState,
  );
  const findTrackById = useTracksStore((state) => state.findById);

  const currentTrack = currentTrackId
    ? findTrackById(currentTrackId)
    : null;

  const showPlayer =
    fetchTracksState !== 'pending' &&
    tracks.length > 0 &&
    currentTrack;

  return (
    <React.Fragment>
      {showPlayer && currentTrack && (
        <React.Fragment>
          <Helmet>
            <title>{currentTrack.title}</title>
          </Helmet>
          <div
            className="bg-white px-3 pt-3 pb-1"
            style={{
              boxShadow:
                '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            <PlayerControls
              volume={volume}
              onVolumeChange={setVolume}
              onPause={pause}
              onResume={resume}
              track={currentTrack}
              playing={playing}
              muted={muted}
              onMute={mute}
              onUnmute={unmute}
              progress={progress}
              onProgressChange={setProgress}
              cuePosition={cuePosition}
              onCuePositionChange={setCuePosition}
              onForward={forward}
              onRewind={rewind}
              trackDuration={trackDuration}
              setTrackDuration={setTrackDuration}
              playNextSong={playNextSong}
            />
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

type PlayerControlsProps = {
  track: TrackModel;
  playing: boolean;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onResume: () => void;
  onPause: () => void;
  muted: boolean;
  onMute: () => void;
  onUnmute: () => void;
  progress: number;
  onProgressChange: (progress: number) => void;
  cuePosition: number;
  onCuePositionChange: (cuePos: number) => void;
  onForward: (secs: number) => void;
  onRewind: (secs: number) => void;
  trackDuration: number;
  setTrackDuration: (duration: number) => void;
  playNextSong:() => void;
};

function PlayerControls({
  track,
  playing,
  onPause,
  onResume,
  volume,
  onVolumeChange,
  muted,
  onMute,
  onUnmute,
  progress,
  onProgressChange,
  cuePosition,
  onCuePositionChange,
  onForward,
  onRewind,
  trackDuration,
  setTrackDuration,
  playNextSong,
}: PlayerControlsProps) {
  const [debug] = useState(false);
  const player = useRef<PlayerRef>(null);

  const isMed = useMedia('(min-width: 768px)');

  const lastSeekPos = useRef(0);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [seeking, setSeeking] = useState(false);

  function onPlayerReady(trackDuration: number) {
    setPlayerReady(true);
    setTrackDuration(trackDuration);
    setPlayerProgress(0);
  }

  useEffect(()=>{
    if(player && player.current){
      player.current.seekTo(cuePosition);
    }
  }, [cuePosition, player, player.current])
    
  // TODO: Remove when mobile player done
  const useEmbed = useMemo(() => {
    console.log('debug', debug, 'isMed', isMed);
    return debug || !isMed;
  }, [isMed, debug]);

  function onAudioProgress(progress: number) {
    if (!seeking) {
      setPlayerProgress(progress);
      onProgressChange(progress);
      if(progress>10){
        playNextSong();
      }
    }
  }

  useEffect(() => {
    setPlayerProgress(0);
    onCuePositionChange(0);
  }, [track, onCuePositionChange]);

  return (
    <React.Fragment>
      <div
        className={cx('gap-5 grid grid-cols-3 xl:grid-cols-10', {
          // hidden: useEmbed,
        })}
      >
        <div className="xl:col-span-2 flex items-center space-x-3 ">
          <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden relative">
            <div
              className="w-full h-full bg-gray-200"
              // src={track.picture_large}
              // alt={track.title}
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-md font-bold leading-tight">
              {track.title}
            </div>
            <div className="text-gray-700 text-md">
              {track.album}
            </div>
          </div>
        </div>
        {/* Player */}
        <div className="flex flex-col items-center justify-center xl:col-span-6 space-y-1">
          <div className="flex items-center justify-center space-x-4">
            <button
              title="Rewind 30 seconds"
              onClick={() => onRewind(30)}
              className={cx(
                'bg-transparent rounded-full text-gray-700 p-2',
                'transition-all duration-200 ease-in-out',
                'hover:text-gray-900',
                'focus:outline-none focus:bg-gray-200',
              )}
            >
              <IconBackThirty className="fill-current h-8 w-8" />
            </button>
            <button
              onClick={() => (playing ? onPause() : onResume())}
              className={cx(
                'p-2 rounded-full bg-indigo-600 border shadow-md text-white leading-none',
                'transition-all duration-200 ease-in-out',
                'hover:bg-indigo-700 hover:shadow-lg',
                'focus:outline-none focus:bg-indigo-700',
              )}
            >
              {playing ? (
                <IconPause className="fill-current w-8 h-8 inline-block" />
              ) : (
                <IconPlay className="fill-current w-8 h-8 inline-block" />
              )}
            </button>
            <button
              title="Forward 30 seconds"
              onClick={() => onForward(30)}
              className={cx(
                'bg-transparent rounded-full text-gray-700 p-2',
                'transition-all duration-200 ease-in-out',
                'hover:text-gray-900',
                'focus:outline-none focus:bg-gray-200',
              )}
            >
              <IconSkipThirty className="fill-current h-8 w-8" />
            </button>
          </div>
          <div className="max-w-3xl w-full">
            <>
              <div className="flex justify-center items-center">
                <div className="text-xs w-10 text-right">
                  {formatTime(Math.ceil(playerProgress))}
                </div>
                <div className="flex flex-1 flex-col justify-center max-w-xl mx-3 relative w-full">
                  <Slider
                    max={trackDuration}
                    value={playerProgress}
                    onMouseDown={() => setSeeking(true)}
                    onChange={(newVal) => {
                      setPlayerProgress(newVal);
                      lastSeekPos.current = newVal;
                    }}
                    onMouseUp={() => {
                      setSeeking(false);
                      onCuePositionChange(lastSeekPos.current);
                    }}
                  />
                </div>
                <div className="text-xs w-10">
                  {formatTime(Math.ceil(trackDuration))}
                </div>
              </div>
            </>
          </div>
        </div>
        <div className="xl:col-span-2 flex items-center space-x-2 justify-end">
          <div className="flex space-x-1 items-center">
            <a
              className={cx(
                'inline-block p-2 rounded-full',
                'transition-all duration-200 ease-in-out',
                'hover:bg-gray-200 ',
              )}
              title="Open in SoundCloud"
              target="_blank"
              rel="noopener noreferrer"
              href={track.url}
            >
              <IconSoundcloud className="fill-current w-5 h-5" />
            </a>
            <div className="flex space-x-1 items-center">
              <button
                className={cx(
                  'inline-block p-1 rounded-full',
                  'transition-all duration-200 ease-in-out',
                  'hover:bg-gray-200',
                  'focus:outline-none',
                )}
                title={muted ? 'Unmute' : 'Mute'}
                onClick={() => {
                  muted ? onUnmute() : onMute();
                }}
              >
                <IconSpeaker className="fill-current w-5 h-5" />
              </button>
              <div className="w-40 pr-4">
                <Slider
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(val) => onVolumeChange(val)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MP3Player
        player={player}
        key={track.id}
        onReady={onPlayerReady}
        track={track}
        playing={playing}
        volume={volume}
        position={progress}
        onPlayProgressChange={onAudioProgress}
        playNextSong={playNextSong}
      />
    </React.Fragment>
  );
}

