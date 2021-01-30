import create from 'zustand'
import { createApiClient } from '../workers/apiClient';


const apiClient = createApiClient();

export type TrackModel = {
  id: string;
  url: string;
  duration: number;
  artist: string;
  title: string;
  album: string; 
  date:  string;
  lastModified: string,
  key: number | string;
}

function trackMapper(dto: any): TrackModel {
  const song = dto.key.split('/');
  const album = song[1];
  const artist = song[0];
  const title = song[2];
  const url = `https://gogogarden191046-dev.s3.amazonaws.com/public/${artist}/${album}/${title}`
  return {
    id: dto.key,
    url,
    duration: dto.key,
    artist,
    title,
    album, 
    date:  dto.date,
    lastModified: dto.lastModified,
    key: dto.key,
  }
}

type TrackStore = {
  tracks: TrackModel[];
  fetchTracksState: "pending" | "resolved" | "rejected";
  rejectionReason?: string;
  fetchTracks: () => Promise<void>;
  findById: (id: string) => TrackModel | undefined;
}

export const useTracksStore = create<TrackStore>((set, get) => ({
  tracks: [],
  fetchTracksState: "pending",
  findById(id:string) {
    return get().tracks.find((t) => t.id === id)
  },
  fetchTracks: async () => {
    console.log('fretch')
    try {
      const trackDtos = await apiClient.getTracks();
      console.log(trackDtos, 'bro')
      const trackModels = await trackDtos.map(trackMapper);
      set({
        tracks: trackModels,
        fetchTracksState: 'resolved'
      })
    } catch(err) {
      set({
        fetchTracksState: 'rejected',
        rejectionReason: err
      })
    }
  },
}))