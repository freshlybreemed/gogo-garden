import React from 'react';
import { ArtistModel } from '../../stores/ArtistStore';

type ArtistProps = {
  onClick: () => void;
  artist: ArtistModel;
  selected: boolean;
};
export function Artist({ onClick, artist }: ArtistProps) {
  return <div>{artist.name}</div>;
}
