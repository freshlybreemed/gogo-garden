import React, { useState, useRef, useEffect } from 'react';
import { TrackModel } from '../../stores/TracksStore';

//   useEffect(() => {
//     if (window.SC) {
//       setLoadingState('loaded');
//       return;
//     }
//     const script = document.createElement('script');
//     script.src = 'https://w.soundcloud.com/player/api.js';
//     script.onload = () => setLoadingState('loaded');
//     script.onerror = () =>
//       console.error('error loading soundcloud widget API');
//     // @todo decide if this is sensible.
//     // script.async = true
//     document.body.appendChild(script);
//   }, [loadingState]);

//   return loadingState === 'loaded';
// }

export interface MP3PlayerWidgetProps {
  playing?: boolean;
  position?: number;
  volume?: number;
  onReady?: (trackDuration: number) => void;
  onPlayProgressChange?: (position: number) => void;
  onPause?: () => void;
  onPlay?: () => void;
  showNative?: boolean;
  track: TrackModel;
}

export function MP3Player(props: MP3PlayerWidgetProps) {
  const widgetIframeRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);
  const widgetRef = useRef<any>(null);

  const {
    onPlayProgressChange,
    onReady,
    track,
    volume = 80,
    showNative,
  } = props;

  //   useEffect(() => {
  //     widgetRef.current = window.SC.Widget(widgetIframeRef.current);

  //     return () => {
  //       widgetRef.current = null;
  //     };
  //   }, []);

  //   useEffect(() => {
  //     if (widgetRef.current && !ready) {
  //       widgetRef.current.bind(window.SC.Widget.Events.READY, () => {
  //         // return track duration when ready
  //         widgetRef.current.getCurrentSound((currentSound: any) => {
  //           onReady && onReady(currentSound.full_duration);
  //           setReady(true);
  //         });
  //       });
  //     }

  //     return () => {
  //       if (widgetRef.current) {
  //         widgetRef.current.unbind(window.SC.Widget.Events.READY);
  //         widgetRef.current.unbind(window.SC.Widget.Events.FINISH);
  //         widgetRef.current.unbind(window.SC.Widget.Events.SEEK);
  //       }
  //     };
  //   }, [ready, onReady, track]);

  //   // bind PlayProgress callback
  useEffect(() => {
    if (widgetIframeRef.current) {
      // console.log(
      //   widgetIframeRef.current.duration,
      //   widgetIframeRef.current.currentTime,
      // );
      // widgetIframeRef.current.bind((ev: any) => {
      onPlayProgressChange &&
        onPlayProgressChange(widgetIframeRef.current.currentTime);
      // });
    }

    // return () => {
    //   if (widgetRef.current) {
    //     widgetRef.current.unbind(
    //       window.SC.Widget.Events.PLAY_PROGRESS,
    //     );
    //   }
    // };
  }, [ready, onPlayProgressChange, track]);

  // useEffect(() => {
  //   if (widgetIframeRef.current && ready) {
  //     widgetIframeRef.current.seekTo(props.position || 0);
  //   }
  // }, [props.position, track, ready]);

  useEffect(() => {
    if (widgetIframeRef.current && ready) {
      widgetIframeRef.current.volume = volume;
    }
  }, [volume, track, ready]);

  useEffect(() => {
    if (widgetIframeRef.current) {
      console.log('aplay', widgetIframeRef, props.playing);
      if (props.playing) {
        widgetIframeRef.current.play();
        // widgetRef.current.bind(
        //   window.SC.Widget.Events.PLAY_PROGRESS,
        //   (ev: any) => {
        //     onPlayProgressChange &&
        //       onPlayProgressChange(ev.currentPosition);
        //   },
        // );
      } else {
        widgetIframeRef.current.pause();
      }
    }
  }, [props.playing, track]);

  return (
    <div style={{ transform: showNative ? 'scale(1)' : 'scale(0)' }}>
      <audio ref={widgetIframeRef} title={track.title} autoPlay>
        <source src={track.url} />
      </audio>
    </div>
  );
}
