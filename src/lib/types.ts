// Plain, serializable models passed from Server Components to the client.

export type ArtistModel = {
  id: string;
  name: string;
  shortName: string;
  useShortName: boolean;
  image?: string;
};

export type TrackModel = {
  id: string;
  artistId: string;
  url: string;
  duration: number;
  artist: string;
  title: string;
  album: string;
  imageUrl: string;
  trackNumber: number;
  streams: number;
  /** ISO string (the old mapper also aliased `date` to lastModified). */
  date: string | null;
  lastModified: string | null;
};

export type AlbumModel = {
  name: string;
  artist: string;
  artistId: string;
  imageUrl: string;
};
