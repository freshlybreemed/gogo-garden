import create from 'zustand';
import { createApiClient, ArtistDTO } from '../workers/apiClient';

const apiClient = createApiClient();

export type ArtistModel = {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  image?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
};

function artistMapper(dto: ArtistDTO): ArtistModel {
  return {
    id: dto.id,
    name: dto.name,
    shortName: dto.shortName,
    image:dto.image
  };
}
type ArtistStore = {
  artists: ArtistModel[];
  currentArtistId: string;
  fetchArtistsState: 'pending' | 'resolved' | 'rejected';
  rejectionReason?: string;
  fetchArtists: () => Promise<void>;
  findById: (id: string) => ArtistModel | undefined;
};

export const useArtistStore = create<ArtistStore>((set, get) => ({
  artists: [],
  currentArtistId: '',
  fetchArtistsState: 'pending',
  fetchArtists: async () => {
    try {
      const artistDtos = await apiClient.getArtists();
      console.log(artistDtos, 'bro');
      const artistModels = await artistDtos.map(artistMapper);
      set({
        artists: artistModels,
        fetchArtistsState: 'resolved',
      });
    } catch (err) {
      set({
        fetchArtistsState: 'rejected',
        rejectionReason: err,
      });
    }
  },
  findById: (id: string) => get().artists.find((t) => t.id === id),
}));

export type UserPlaylistModel = PlaylistModel[];

export type PlaylistModel = {
  ownerId: string;
  id: string;
  title: string;
  description: string;
  trackId: string;
  trackTitle: string;
  trackGenre: string;
  trackLength: string;
  artistID: string;
  artistTitle: string;
};

export type UserModel = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  signUpDate: string;
  userPlaylists: UserPlaylistModel;
  followingArtists: ArtistModel[];
  followingPlaylists: [string];
};
