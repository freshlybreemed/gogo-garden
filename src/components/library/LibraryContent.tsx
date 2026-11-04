import { ArtistLibrary } from './ArtistLibrary';
import { SongLibrary } from './SongLibrary';
import { AlbumLibrary } from './AlbumLibrary';
import type { AlbumModel, ArtistModel, TrackModel } from '@/lib/types';
import type { Screen } from '@/stores/AppStore';

type LibraryProps = {
  artists: ArtistModel[];
  albums: AlbumModel[];
  currentArtist?: ArtistModel;
  onArtistClick: (artist: ArtistModel) => void;
  onAlbumClick: (album: AlbumModel) => void;
  filterText?: string;
  screen?: Screen;
  tracks: TrackModel[];
  currentTrackId?: string;
  onTrackClick: (trackId: string) => void;
  onRandomClick: () => void;
};

export function LibraryContent({
  artists,
  tracks,
  albums,
  onAlbumClick,
  currentTrackId,
  onArtistClick,
  onTrackClick,
  screen,
  filterText,
  onRandomClick,
}: LibraryProps) {
  return (
    <>
      {screen === 'album' && (
        <AlbumLibrary albums={albums} onAlbumClick={onAlbumClick} filterText={filterText} />
      )}
      {screen === 'home' && (
        <ArtistLibrary artists={artists} onArtistClick={onArtistClick} filterText={filterText} />
      )}
      {screen === 'songs' && (
        <SongLibrary
          tracks={tracks}
          onTrackClick={onTrackClick}
          currentTrackId={currentTrackId}
          filterText={filterText}
          onRandomClick={onRandomClick}
        />
      )}
    </>
  );
}
