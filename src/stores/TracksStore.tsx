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
  trackNumber:  number; 
  date: Date;
  streams: number;
  lastModified: Date;
  key: number | string;
};

function trackMapper(dto: TrackDTO): TrackModel {
  const { title, streams, album, artistId, trackNumber, artist, duration, imageUrl, url, key } = dto
  return {
    id: dto.key,
    url,
    duration,
    trackNumber,
    artist,
    title,
    artistId,
    album,
    streams,
    date: dto.lastModified,
    lastModified: dto.lastModified,
    key,
    imageUrl
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
