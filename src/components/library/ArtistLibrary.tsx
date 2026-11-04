import { VirtualList } from './VirtualList';
import { Artist } from './rows/artist';
import { libraryContainerStyle } from './styles';
import type { ArtistModel } from '@/lib/types';

type ArtistProps = {
  artists: ArtistModel[];
  currentArtist?: ArtistModel;
  onArtistClick: (artist: ArtistModel) => void;
  focusArtistId?: string;
  filterText?: string;
};

export function ArtistLibrary({
  artists,
  currentArtist,
  onArtistClick,
  focusArtistId,
}: ArtistProps) {
  return (
    <>
      <h2>Artists</h2>
      <div
        style={libraryContainerStyle}
        className="flex h-full justify-center relative mx-4"
      >
        {artists.length > 0 && (
          <VirtualList
            items={artists}
            focusIndex={artists.findIndex((t) => t.id === focusArtistId)}
            renderItem={(artist) => (
              <Artist
                onClick={() => onArtistClick(artist)}
                artist={artist}
                selected={artist.id === currentArtist?.id}
              />
            )}
          />
        )}
      </div>
    </>
  );
}
