'use client';

import { useEffect, useRef } from 'react';
import { IconSearch, IconTimes } from '../icons';
import { KEYS } from '@/lib/helpers';
import { useAppStore } from '@/stores/AppStore';

// Was a styled-components `SearchBar` input.
const searchBarStyle: React.CSSProperties = {
  background: '#FFFFFF80 0% 0% no-repeat padding-box',
  border: '2px solid #FFFFFF',
  borderRadius: '30px',
  opacity: 0.2,
  color: 'white',
};

type Props = {
  searchText: string;
  setSearchText: (searchText: string) => void;
  onCloseClick: () => void;
  openSearch: () => void;
};

export default function NavbarSearch({
  searchText,
  setSearchText,
  onCloseClick,
  openSearch,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const setScreen = useAppStore((state) => state.setScreen);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === KEYS.ESCAPE) {
      event.nativeEvent.stopImmediatePropagation();
      onCloseClick();
    }
  }

  return (
    <div className="mx-full w-full ml-auto text-white">
      <div className="flex flex-grow items-center relative">
        <div className="text-gray-500 absolute pl-4">
          <IconSearch className="fill-current w-6 h-6"></IconSearch>
        </div>
        <input
          style={searchBarStyle}
          onClick={openSearch}
          ref={searchRef}
          onKeyDown={handleKeydown}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setScreen('songs');
          }}
          type="text"
          className="w-full py-2 pl-12 rounded-lg bg-gray-200 text-white outline-none focus:bg-gray-300 focus:border-gray-400"
          placeholder="Search..."
        />
        <div className="flex items-center ml-auto absolute right-0 mr-3">
          <button
            className="p-2 text-gray-700 hover:bg-gray-400 hover:text-gray-600 hover:shadow-sm rounded-lg focus:outline-none"
            onClick={() => onCloseClick()}
          >
            <IconTimes className="fill-current w-3 h-3"></IconTimes>
          </button>
        </div>
      </div>
    </div>
  );
}
