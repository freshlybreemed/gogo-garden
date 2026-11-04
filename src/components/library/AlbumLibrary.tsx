import { VirtualList } from './VirtualList';
import { Album } from './rows/album';
import { libraryContainerStyle } from './styles';
import type { AlbumModel } from '@/lib/types';

type AlbumProps = {
  albums: AlbumModel[];
  currentAlbum?: AlbumModel;
  onAlbumClick: (albums: AlbumModel) => void;
  focusArtistId?: string;
  filterText?: string;
};

export function AlbumLibrary({
  albums,
  currentAlbum,
  onAlbumClick,
  focusArtistId,
}: AlbumProps) {
  return (
    <>
      {/* Heading said "Artists" on the album screen in the original too. */}
      <h2>Artists</h2>
      <div
        style={libraryContainerStyle}
        className="flex h-full justify-center relative mx-4"
      >
        {albums.length > 0 && (
          <VirtualList
            items={albums}
            focusIndex={albums.findIndex((t) => t.artistId === focusArtistId)}
            renderItem={(album) => (
              <Album
                onClick={() => onAlbumClick(album)}
                album={album}
                selected={album.name === currentAlbum?.name}
              />
            )}
          />
        )}
      </div>
    </>
  );
}
