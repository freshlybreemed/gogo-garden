import React, { useEffect } from 'react';
import { filter, sample } from 'lodash-es';
import { TrackModel, useTracksStore } from '../../stores/TracksStore';
import shallow from 'zustand/shallow';
import ReactGA from 'react-ga';
import { usePlayerStore } from '../../stores/PlayerStore';
import { IconPause } from '../icons';
import { ArtistModel, useArtistStore } from '../../stores/ArtistStore';
import algoliasearch from 'algoliasearch'
import { useAppStore } from '../../stores/AppStore';
import { useNavbarStore } from '../../stores/NavigationStore';
import { getArtistName } from '../../lib/helpers';
const client = algoliasearch(process.env.ALGOLIA_ID|| 'VUP25M59V9', process.env.ALGOLIA_KEY || '401c3a392393dedd2f1f69e795b84e01');
const index = client.initIndex('songs');


export function useLibraryContainer(filterText: string) {
  const currentTrackId = usePlayerStore(
    (state) => state.currentTrackId,
  );
  const currentArtist = useArtistStore(
    (state) => state.currentArtist,
  );
  const play = usePlayerStore((state) => state.play);
  const playing = usePlayerStore((state) => state.playing);
  const screen = useAppStore((state) => state.screen);
  const pause = usePlayerStore((state) => state.pause);
  const setScreen = useAppStore((state)=> state.setScreen);
  const artists = useArtistStore((state) => state.artists);
  const tracks = useTracksStore((state) => state.tracks);
  const fetchArtists = useArtistStore((state) => state.fetchArtists);
  const setCurrentArtist = useArtistStore((state) => state.setCurrentArtist);
  const fetchTracks = useTracksStore((state) => state.fetchTracks);
  const [fetchTracksState, fetchTracksErr] = useTracksStore(
    (state) => [state.fetchTracksState, state.rejectionReason],
    shallow,
  );
  const [fetchArtistsState, fetchArtistsErr] = useArtistStore(
    (state) => [state.fetchArtistsState, state.rejectionReason],
    shallow,
  );
  const searchText = useNavbarStore((state) => state.searchText);
  const setSearchText = useNavbarStore((state) => state.setSearchText);
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

  function onArtistClick (inputArtist: ArtistModel) {
    const artist = artists.find((t) => t.id === inputArtist.id);
    setSearchText(getArtistName(inputArtist));
    setCurrentArtist(inputArtist);
    setScreen('artist');
    ReactGA.event({
      category: 'User',
      action: 'Artist Click',
      label: artist && artist.name ? artist.name : inputArtist.id,
    });
    console.log(screen, 'curr',inputArtist, 'text', searchText);
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

  const filteredTracks: TrackModel[] = React.useMemo( () => {
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
    currentArtist,
    onTrackClick,
    onRandomClick,
    onArtistClick,
    filteredTracks,
    setScreen,
    screen,
    searchText,
    setSearchText,
    filteredArtists,
    activate: fetchTracksState,
    fetchTracksErr,
  };
}
