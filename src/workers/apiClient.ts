import Amplify, { Storage } from 'aws-amplify';
import awsExports from '../aws-exports';
Amplify.configure(awsExports);

export function createApiClient() {
  return new APIClient();
}

export type ArtistDTO = {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  image?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
};
export type TrackDTO = {
  //  _id: string;
  // duration: number;
  // artist: string;
  // title: string;
  // album: string;
  // date:  Date;
  key: string;
  Tag: string;
  lastModified: Date;
  size: number;
};
export class APIClient {
  get client() {
    return Storage;
  }

  getTracks(): Promise<TrackDTO[]> {
    return this.client.list('');
  }

  getArtists(): Promise<ArtistDTO[]> {
    // return this.graphql.find('artists')
    return this.client.list('');
  }
}

export type GetTracksDTO = {
  tracks: TrackDTO[];
};

export type GetArtistsDTO = {
  artist: ArtistDTO[];
};

type UpdateEpisodeDTO = {
  msg: string;
  retrievedTracks: string[];
};
