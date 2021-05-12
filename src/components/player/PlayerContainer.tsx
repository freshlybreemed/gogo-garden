import React, {useEffect} from 'react';
import { sample } from 'lodash-es'
import { useTracksStore } from '../../stores/TracksStore'
import { usePlayerStore } from '../../stores/PlayerStore';
import { useLibraryContainer } from '../library/LibraryContainer';

export function usePlayerContainer(filterText: string) {
  const currentTrackId = usePlayerStore((state) => state.currentTrackId);
  const playing = usePlayerStore((state) => state.playing);
  const play = usePlayerStore((state) => state.play);
  const tracks = useTracksStore((state) => state.tracks)
  const findTrackById = useTracksStore((state) => state.findById)
  const { filteredTracks } = useLibraryContainer(filterText)
  const fetchTracksState = useTracksStore((state) => state.fetchTracksState);
  
  const currentTrack = currentTrackId ? findTrackById(currentTrackId) : null
  const showPlayer = fetchTracksState !== 'pending' && tracks.length > 0 && currentTrack && playing;

  useEffect(() => {
    if (fetchTracksState === 'resolved'){
      const track = sample(tracks);
      console.log('sure ya right')
      // track && play(track.id)
    }
  },[fetchTracksState])

  const playNextSong = () =>{
    const index = filteredTracks.findIndex((val)=>val.id === currentTrackId);
    if(index >= 0 && filteredTracks.length > index){
      play(filteredTracks[index+1].id);
    }
  };

  return {
    currentTrack,
    showPlayer,
    playing,
    play,
    playNextSong
  }


}
