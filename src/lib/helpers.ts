import { ArtistModel } from '../stores/ArtistStore';

export const getArtistName = (artist: ArtistModel) => {
  return artist.useShortName? artist.shortName: artist.name;
}