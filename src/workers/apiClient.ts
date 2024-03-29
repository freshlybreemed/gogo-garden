import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { query } from 'express';

export function createApiClient() {
  return new APIClient();
}

export type AlbumDTO = {
  name: string;
  artist: string;
  artistId: string;
  imageUrl: string;
};

export type ArtistDTO = {
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

export type TrackDTO = {
  _id: string;
  duration: number;
  artist: string;
  title: string;
  album: string;
  date:  Date;
  streams:  number;
  trackNumber:  string;
  url:  string;
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
              _id
              artistId
              url
              duration
              artist
              title
              album
              date
              imageUrl
              streams
              trackNumber
              lastModified
            }
          }
        `,
      })
      .then((result) => result.data.songs);
  }

  postStreamUp($songId: string): Promise<TrackDTO> {
    const mutation = gql`
      mutation PostStreamUp($songId: String!) {
        streamUp(songId: $songId){
          songId
          streams
          artist
          title
        }
      }
    `;
    return this.client.mutate({
      mutation,
      variables: {
        songId: $songId
      }
    }).then(res=>{
      console.log(res);
      return res.data
    })
  }
  getAlbums($artistId: string): Promise<AlbumDTO[]> {
    const albumQuery = gql`
      query albums($artistId: String) {
        albums(artistId: $artistId){
          artist
          name
          artistId
        }
      }
    `;
    return this.client
      .query({
        query: albumQuery,
        variables: {
          artistId: $artistId
        }
      })
      .then((result) => {
        console.log('getAlbums result',result)
        return result.data.albums
      });
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

    userSignup(user:any) {
      const input = user;
      const userSignupMutation = gql`
        mutation signup($input:SignupInput) {
        signup(input: $input){
          result
        }
      }
    `;
      return this.client
        .mutate({
          mutation: userSignupMutation,
          variables: {
            input: input
          }
        })
    }

    userLogin($email:string) {
      const userLoginMutation = gql`
        mutation($email: String){
          login(email: $email){
            result
          }
        }
      `;
      return this.client
        .mutate({
          mutation: userLoginMutation,
          variables: {
            email: $email
          }
        })
    }

}




export type GetTracksDTO = {
  songs: TrackDTO[];
};

export type GetAlbumsDTO = {
  albums: AlbumDTO[];
};

export type GetArtistsDTO = {
  artists: ArtistDTO[];
};

type UpdateEpisodeDTO = {
  msg: string;
  retrievedTracks: string[];
};
