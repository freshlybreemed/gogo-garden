import { VirtualList } from './VirtualList';
import { Track } from './rows/track';
import type { TrackModel } from '@/lib/types';

type TrackProps = {
  tracks: TrackModel[];
  currentTrackId?: string;
  onTrackClick: (trackId: string) => void;
  onRandomClick: () => void;
  focusTrackId?: string;
  filterText?: string;
};

export function SongLibrary({ tracks, onTrackClick, currentTrackId }: TrackProps) {
  return (
    <div className="flex h-full justify-center relative">
      {tracks.length > 0 && (
        <VirtualList
          items={tracks}
          renderItem={(track) => (
            <Track
              onClick={() => onTrackClick(track.id)}
              track={track}
              playing={track.id === currentTrackId}
            />
          )}
        />
      )}
    </div>
  );
}
