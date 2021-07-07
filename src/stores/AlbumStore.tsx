import create from 'zustand';
import { createApiClient, AlbumDTO} from '../workers/apiClient';

const apiClient = createApiClient();

export type AlbumModel = {
  name: string;
  artist: string;
  artistId: string;
  imageUrl: string;
};

function albumMapper(dto: AlbumDTO): AlbumModel {
  const {name, artist, artistId,imageUrl} = dto;
  return {
    name,
    artist,
    artistId,
    imageUrl
  };
}

type AlbumStore = {
  albums: AlbumModel[];
  fetchAlbumsState: 'pending' | 'resolved' | 'rejected';
  rejectionReason?: string;
  currentAlbum?: AlbumModel;
  fetchAlbumsByArtist: (artistId: string) => Promise<void>;
  setCurrentAlbum: (album: AlbumModel) => void;

};

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  albums: [],
  fetchAlbumsState: 'pending',
  fetchAlbumsByArtist: async (artistId: string) => {
    try {
      set({
        fetchAlbumsState: 'pending',
      });
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
    setCurrentAlbum:(album: AlbumModel) => set({currentAlbum:album}),

}));
