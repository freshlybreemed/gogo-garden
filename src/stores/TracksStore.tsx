import create from 'zustand';
import { createApiClient, TrackDTO } from '../workers/apiClient';

const apiClient = createApiClient();

export type TrackModel = {
  id: string;
  artistId: string;
  url: string;
  duration: number;
  artist: string;
  title: string;
  album: string;
  imageUrl: string;
  date: Date;
  streams: number;
  lastModified: Date;
  key: number | string;
};

function trackMapper(dto: TrackDTO): TrackModel {
  const song = dto.key.split('/');
  const album = song[1];
  const artist = song[0];
  const title = song[2].split('.')[0];
  const url = `https://gogogarden191046-dev.s3.amazonaws.com/public/${dto.key}`;
  return {
    id: dto.key,
    url,
    duration: 2,
    artist,
    title,
    artistId: dto.artistId,
    album,
    streams: 0,
    date: dto.lastModified,
    lastModified: dto.lastModified,
    key: dto.key,
    imageUrl: dto.imageUrl
  };
}

type TrackStore = {
  tracks: TrackModel[];
  fetchTracksState: 'pending' | 'resolved' | 'rejected';
  rejectionReason?: string;
  fetchTracks: () => Promise<void>;
  findById: (id: string) => TrackModel | undefined;
};

export const useTracksStore = create<TrackStore>((set, get) => ({
  tracks: [],
  fetchTracksState: 'pending',
  findById(id: string) {
    return get().tracks.find((t) => t.id === id);
  },
  fetchTracks: async () => {
    try {
      const trackDtos = await apiClient.getTracks();
      console.log(trackDtos, 'bro');
      const trackModels = await trackDtos.map(trackMapper);
      set({
        tracks: trackModels,
        fetchTracksState: 'resolved',
      });
    } catch (err) {
      set({
        fetchTracksState: 'rejected',
        rejectionReason: err,
      });
    }
  },
}));
