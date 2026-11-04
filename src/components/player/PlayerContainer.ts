import { usePlayerStore } from '@/stores/PlayerStore';
import { useFilteredTracks } from '../library/LibraryContainer';

export function usePlayerContainer(filterText: string) {
  const currentTrackId = usePlayerStore((state) => state.currentTrackId);
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);
  const streamUp = usePlayerStore((state) => state.streamUp);
  // "Next" walks the list the user is looking at (the current search results).
  const filteredTracks = useFilteredTracks(filterText);

  const playNextSong = () => {
    const index = filteredTracks.findIndex((val) => val.id === currentTrackId);
    const next = index >= 0 ? filteredTracks[index + 1] : undefined;
    if (next) {
      play(next.id);
    } else {
      // End of the list (original cleared the track and hid the player).
      pause();
    }
  };

  return { playNextSong, streamUp };
}
