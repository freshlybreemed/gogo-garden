import React, { useEffect, useRef } from 'react';
import { IconSearch, IconTimes } from '../../components/icons';
import { KEYS } from '../../helpers';
import styled from 'styled-components';

const SearchBar = styled.input`
  background: #FFFFFF80 0% 0% no-repeat padding-box;
  border: 2px solid #FFFFFF;
  border-radius: 30px;
  opacity: 0.2;
  color: white; 
`;

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
  let searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === KEYS.ESCAPE) {
      event.nativeEvent.stopImmediatePropagation();
      onCloseClick();
    }
  }

  return (
    <React.Fragment>
      <div className="mx-full w-full ml-auto text-white">
        <div className="flex flex-grow items-center relative">
          <div className="text-gray-500 absolute pl-4">
            <IconSearch className="fill-current w-6 h-6"></IconSearch>
          </div>
          <SearchBar
            onClick={openSearch}
            ref={searchRef}
            onKeyDown={handleKeydown}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            type="text"
            className="w-full py-2 pl-12 pl-3 rounded-lg bg-gray-200 text-white outline-none focus:bg-gray-300 focus:border-gray-400"
            placeholder="Search..."
          ></SearchBar>
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
    </React.Fragment>
  );
}
