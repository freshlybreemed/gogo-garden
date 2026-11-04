import clsx from 'clsx';
import { getArtistName } from '@/lib/helpers';
import type { ArtistModel } from '@/lib/types';

type ArtistProps = {
  onClick: () => void;
  artist: ArtistModel;
  selected: boolean;
};
export function Artist({ onClick, artist }: ArtistProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex flex-column items-center justify-between text-left cursor-pointer w-full p-3 rounded-lg border border-transparent',
        'hover:shadow-lg hover:border hover:border-gray-200',
        'focus:outline-none focus:bg-gray-100 focus:border focus:border-gray-200',
      )}
    >
      <div className="flex items-center justify-start text-left">
        <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden relative">
          <div
            className="w-full h-full "
            style={{
              backgroundImage: artist.image ? `url(${artist.image})` : undefined,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="hidden md:block relative leading-none p-1 bg-white group-hover:bg-white rounded-full text-indigo-600 hover:bg-gray-200 hover:shadow-sm"></div>
        </div>
        <div className="ml-2 pl-2 md:flex md:flex-col md:flex-col-reverse">
          <div className="text-sm md:text-base">
            <span>{getArtistName(artist)}</span>
          </div>
        </div>
      </div>
      <div className="hidden md:block">
        <span></span>
      </div>
    </div>
  );
}
