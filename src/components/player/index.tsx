'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, playerStoreSelectors } from '@/stores/PlayerStore';
import { useAppData } from '../AppData';
import { formatTime } from '@/lib/helpers';
import type { TrackModel } from '@/lib/types';
import {
  IconBackThirty,
  IconPause,
  IconPlay,
  IconSkipThirty,
  IconSoundcloud,
  IconSpeaker,
} from '../icons';
import { MP3Player, type PlayerHandle } from './player';
import { Slider } from './Slider';
import { usePlayerContainer } from './PlayerContainer';

/** Seconds of playback before a listen counts as a stream. */
const STREAM_THRESHOLD_SECS = 30;

type Props = {
  filterText?: string;
};

export default function Player({ filterText = '' }: Props) {
  const {
    playing,
    volume,
    currentTrackId,
    trackDuration,
    cuePosition,
    pause,
    resume,
    setProgress,
    setVolume,
    mute,
    unmute,
    muted,
    setCuePosition,
    forward,
    rewind,
    setTrackDuration,
  } = usePlayerStore(
    useShallow((state) => ({
      playing: state.playing,
      volume: state.volume,
      currentTrackId: state.currentTrackId,
      trackDuration: state.trackDuration,
      cuePosition: state.cuePosition,
      pause: state.pause,
      resume: state.resume,
      setProgress: state.setProgress,
      setVolume: state.setVolume,
      mute: state.mute,
      muted: playerStoreSelectors.muted(state),
      unmute: state.unmute,
      setCuePosition: state.setCuePosition,
      forward: state.forward,
      rewind: state.rewind,
      setTrackDuration: state.setTrackDuration,
    })),
  );
  const { playNextSong, streamUp } = usePlayerContainer(filterText);
  const { tracks, findTrackById } = useAppData();

  const currentTrack = currentTrackId ? findTrackById(currentTrackId) : undefined;
  const showPlayer = tracks.length > 0 && currentTrack;

  // Was <Helmet><title>{track.title}</title></Helmet>.
  useEffect(() => {
    if (!currentTrack) return;
    const previous = document.title;
    document.title = currentTrack.title;
    return () => {
      document.title = previous;
    };
  }, [currentTrack]);

  if (!showPlayer) return null;

  return (
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
        onProgressChange={setProgress}
        cuePosition={cuePosition}
        onCuePositionChange={setCuePosition}
        onForward={forward}
        onRewind={rewind}
        trackDuration={trackDuration}
        setTrackDuration={setTrackDuration}
        playNextSong={playNextSong}
        onStreamThreshold={streamUp}
      />
    </div>
  );
}

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
  onProgressChange: (progress: number) => void;
  cuePosition: number;
  onCuePositionChange: (cuePos: number) => void;
  onForward: (secs: number) => void;
  onRewind: (secs: number) => void;
  trackDuration: number;
  setTrackDuration: (duration: number) => void;
  playNextSong: () => void;
  onStreamThreshold: (trackId: string) => void;
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
  onProgressChange,
  cuePosition,
  onCuePositionChange,
  onForward,
  onRewind,
  trackDuration,
  setTrackDuration,
  playNextSong,
  onStreamThreshold,
}: PlayerControlsProps) {
  const player = useRef<PlayerHandle>(null);
  const lastSeekPos = useRef(0);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [seeking, setSeeking] = useState(false);

  function onPlayerReady(duration: number) {
    setTrackDuration(duration);
    setPlayerProgress(0);
  }

  useEffect(() => {
    player.current?.seekTo(cuePosition);
  }, [cuePosition]);

  function onAudioProgress(position: number) {
    if (!seeking) {
      if (position > STREAM_THRESHOLD_SECS) {
        // Store dedupes, so this fires once per play of a track.
        onStreamThreshold(track.id);
      }
      setPlayerProgress(position);
      onProgressChange(position);
    }
  }

  useEffect(() => {
    setPlayerProgress(0);
    onCuePositionChange(0);
  }, [track, onCuePositionChange]);

  return (
    <>
      <div className="gap-5 grid grid-cols-3 xl:grid-cols-10">
        <div className="xl:col-span-2 flex items-center space-x-3 ">
          <div className="text-black flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden relative">
            <div className="w-full h-full bg-gray-200" />
          </div>
          <div className="text-left flex flex-col justify-center">
            <div className="text-md font-bold text-black leading-tight">{track.title}</div>
            <div className="text-gray-700 text-md">{track.album}</div>
          </div>
        </div>
        {/* Player */}
        <div className="flex flex-col items-center justify-center xl:col-span-6 space-y-1">
          <div className="flex items-center justify-center space-x-4">
            <button
              title="Rewind 30 seconds"
              onClick={() => onRewind(30)}
              className={clsx(
                'bg-transparent rounded-full text-gray-700 p-2',
                'transition-all duration-200 ease-in-out',
                'hover:text-gray-900',
                'focus:outline-none focus:bg-gray-200',
              )}
            >
              <IconBackThirty className="fill-current h-8 w-8" />
            </button>
            <button
              title={playing ? 'Pause' : 'Play'}
              onClick={() => (playing ? onPause() : onResume())}
              className={clsx(
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
              className={clsx(
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
            <div className="flex justify-center items-center">
              <div className="text-xs w-10 text-black text-right">
                {formatTime(Math.ceil(playerProgress))}
              </div>
              <div className="flex flex-1 flex-col justify-center max-w-xl mx-3 relative w-full">
                <Slider
                  aria-label="Seek"
                  style={{ color: 'black' }}
                  max={trackDuration}
                  value={playerProgress}
                  onSeekStart={() => setSeeking(true)}
                  onChange={(newVal) => {
                    setPlayerProgress(newVal);
                    lastSeekPos.current = newVal;
                  }}
                  onCommit={() => {
                    setSeeking(false);
                    onCuePositionChange(lastSeekPos.current);
                  }}
                />
              </div>
              <div className="text-xs text-black w-10">
                {formatTime(Math.ceil(trackDuration))}
              </div>
            </div>
          </div>
        </div>
        <div className="xl:col-span-2 flex items-center space-x-2 justify-end">
          <div className="flex space-x-1 items-center">
            <a
              className={clsx(
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
                className={clsx(
                  'inline-block p-1 rounded-full',
                  'transition-all duration-200 ease-in-out',
                  'hover:bg-gray-200',
                  'focus:outline-none',
                )}
                title={muted ? 'Unmute' : 'Mute'}
                onClick={() => (muted ? onUnmute() : onMute())}
              >
                <IconSpeaker className="fill-current w-5 h-5" />
              </button>
              <div className="w-40 pr-4">
                <Slider
                  aria-label="Volume"
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
        onPlayProgressChange={onAudioProgress}
        playNextSong={playNextSong}
      />
    </>
  );
}
