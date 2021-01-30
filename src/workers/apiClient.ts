import Amplify, { Storage } from 'aws-amplify';

export function createApiClient() {
  return new APIClient();
}


export class APIClient {
  get client() {
    return Storage
  }

  getTracks(): Promise<TrackDTO[]>{
    return this.client.list('')
  }
}

export type TrackDTO = {
  //  _id: string;
  // duration: number;
  // artist: string;
  // title: string;
  // album: string; 
  // date:  Date;
  key: number | string;
  Tag: string;
  lastModified: Date;
  size: number;
}

export type GetTracksDTO = {
  tracks: TrackDTO[];
}

type UpdateEpisodeDTO = {
  msg: string;
  retrievedTracks: string[]
}