import Amplify, { Storage } from 'aws-amplify';
import awsExports from '../aws-exports';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
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
  artistId: string;
  lastModified: Date;
  size: number;
};
export class APIClient {
  get client() {
    return new ApolloClient({
      uri: 'http://localhost:4000/graphql',
      cache: new InMemoryCache(),
    });
  }

  getTracks(): Promise<TrackDTO[]> {
    return this.client
      .query({
        query: gql`
          {
            songs {
              id
              artistId
              url
              duration
              artist
              title
              album
              date
              streams
              lastModified
              key
            }
          }
        `,
      })
      .then((result) => result.data.songs);
  }

  getArtists(): Promise<ArtistDTO[]> {
    return this.client
      .query({
        query: gql`
          {
            artists {
              id
              name
              shortName
              useShortName
            }
          }
        `,
      })
      .then((result) => result.data.artists);
  }
}

export type GetTracksDTO = {
  songs: TrackDTO[];
};

export type GetArtistsDTO = {
  artists: ArtistDTO[];
};

type UpdateEpisodeDTO = {
  msg: string;
  retrievedTracks: string[];
};
