import React, { useEffect } from 'react';
import { sample } from 'lodash-es';
import { useTracksStore } from '../../stores/TracksStore';
import shallow from 'zustand/shallow';
import ReactGA from 'react-ga';
import { usePlayerStore } from '../../stores/PlayerStore';
import { IconPause } from '../icons';
import { useArtistStore } from '../../stores/ArtistStore';

export function useLibraryContainer(filterText: string) {
  const currentTrackId = usePlayerStore(
    (state) => state.currentTrackId,
  );
  const currentArtistId = useArtistStore(
    (state) => state.currentArtistId,
  );
  const play = usePlayerStore((state) => state.play);
  const playing = usePlayerStore((state) => state.playing);
  const pause = usePlayerStore((state) => state.pause);

  const artists = useArtistStore((state) => state.artists);
  const tracks = useTracksStore((state) => state.tracks);
  const fetchArtists = useArtistStore((state) => state.fetchArtists);
  const fetchTracks = useTracksStore((state) => state.fetchTracks);
  const [fetchTracksState, fetchTracksErr] = useTracksStore(
    (state) => [state.fetchTracksState, state.rejectionReason],
    shallow,
  );
  const [fetchArtistsState, fetchArtistsErr] = useArtistStore(
    (state) => [state.fetchArtistsState, state.rejectionReason],
    shallow,
  );

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  function onTrackClick(trackId: string) {
    const track = tracks.find((t) => t.id === trackId);
    ReactGA.event({
      category: 'User',
      action: 'Track Click',
      label: track && track.title ? track.title : trackId,
    });
    if (playing) {
      pause();
    }
    play(trackId);
  }

  function onArtistClick(artistId: string) {
    const artist = artists.find((t) => t.id === artistId);
    ReactGA.event({
      category: 'User',
      action: 'Artist Click',
      label: artist && artist.name ? artist.name : artistId,
    });
  }

  function onRandomClick() {
    ReactGA.event({
      category: 'Action',
      action: 'Play Random',
    });
    let track = sample(tracks);
    if (track) {
      play(track.id);
    }
  }

  const filteredTracks = React.useMemo(() => {
    if (!filterText) {
      return tracks;
    }
    const title = tracks.filter((track) => {
      return track.title
        .toLocaleLowerCase()
        .includes(filterText.toLocaleLowerCase());
    });

    const artist = tracks.filter((track) => {
      return track.artist
        .toLocaleLowerCase()
        .includes(filterText.toLocaleLowerCase());
    });

    const album = tracks.filter((track) => {
      return track.album
        .toLocaleLowerCase()
        .includes(filterText.toLocaleLowerCase());
    });
    return title.concat(artist, album);
  }, [filterText, tracks]);

  const filteredArtists = React.useMemo(() => {
    if (!filterText) {
      return artists;
    }

    return artists.filter((artist) => {
      return artist.name
        .toLocaleLowerCase()
        .includes(filterText.toLocaleLowerCase());
    });
  }, [filterText, tracks]);

  return {
    currentTrackId,
    currentArtistId,
    onTrackClick,
    onRandomClick,
    onArtistClick,
    filteredTracks,
    filteredArtists,
    activate: fetchTracksState,
    fetchTracksErr,
  };
}
