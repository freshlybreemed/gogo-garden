import create from 'zustand';
import { createApiClient, AlbumDTO} from '../workers/apiClient';

const apiClient = createApiClient();

export type AlbumModel = {
  name: string;
  artist: string;
};

function albumMapper(dto: AlbumDTO): AlbumModel {
  return {
    name: dto.name,
    artist: dto.artist
  };
}

type AlbumStore = {
  albums: AlbumModel[];
  fetchAlbumsState: 'pending' | 'resolved' | 'rejected';
  rejectionReason?: string;
  fetchAlbumsByArtist: (artistId: string) => Promise<void>;
};

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  albums: [],
  fetchAlbumsState: 'pending',
  fetchAlbumsByArtist: async (artistId: string) => {
    try {
      const albumDtos = await apiClient.getAlbums(artistId);
      const albumModels = await albumDtos.map(albumMapper);
      set({
        albums: albumModels,
        fetchAlbumsState: 'resolved',
      });
    } catch (err) {
      console.log('error in your useAlbumStore block')
    }
  },
}));
