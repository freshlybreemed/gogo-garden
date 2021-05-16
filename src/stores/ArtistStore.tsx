import create from 'zustand';
import { createApiClient, ArtistDTO } from '../workers/apiClient';

const apiClient = createApiClient();

export type ArtistModel = {
  id: string;
  name: string;
  shortName: string;
  useShortName: string;
  tags?: [string];
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
    useShortName: dto.useShortName,
    image:dto.image,
    tags:dto.tags
  };
}
type ArtistStore = {
  artists: ArtistModel[];
  currentArtist?: ArtistModel;
  fetchArtistsState: 'pending' | 'resolved' | 'rejected';
  rejectionReason?: string;
  setCurrentArtist: (artist: ArtistModel) => void;
  fetchArtists: () => Promise<void>;
  findById: (id: string) => ArtistModel | undefined;
};

export const useArtistStore = create<ArtistStore>((set, get) => ({
  artists: [],
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
  setCurrentArtist:(artist: ArtistModel) => set({currentArtist:artist}),
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


// const artists = {
//     "ABM": {
//         "id": 0,
//         "name": "All Bout Money",
//         "shortName": "ABM",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "Backyard Band": {
//         "id": 1,
//         "name": "Backyard Band",
//         "shortName": "BYB",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "New Impressionz Band": {
//         "id": 2,
//         "name": "New Impressionz Band",
//         "shortName": "NIB",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "New Impressionz": {
//         "id": 3,
//         "name": "New Impressionz",
//         "shortName": "NIB",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "New Visionz": {
//         "id": 4,
//         "name": "New Visionz Band",
//         "shortName": "New Visionz",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "Reaction Band": {
//         "id": 5,
//         "name": "Reaction Band",
//         "shortName": "Reaction",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "TCB": {
//         "id": 6,
//         "name": "TCB",
//         "shortName": "TCB",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     },
//     "TOB": {
//         "id": 7,
//         "name": "Take Ova Boyz",
//         "shortName": "TOB",
//         "description": "",
//         "image": "",
//         "instagram": "",
//         "twitter": "",
//         "youtube": ""
//     }
// }