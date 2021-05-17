import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';

export function createApiClient() {
  return new APIClient();
}

export type ArtistDTO = {
  id: string;
  name: string;
  shortName: string;
  useShortName: string;
  tags?:[ string];
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
  imageUrl: string;
};
export class APIClient {
  get client() {
    return new ApolloClient({
  link: createHttpLink({ uri: "/api/graphql" }),
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
              image
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
