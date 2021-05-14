import React, { useEffect, useRef } from 'react';
import { IconSearch, IconTimes } from '../../components/icons';
import { KEYS } from '../../helpers';
import styled from 'styled-components';

const SearchBar = styled.input`
background: #FFFFFF80 0% 0% no-repeat padding-box;
border: 2px solid #FFFFFF;
border-radius: 30px;
opacity: 0.2;
`;
type Props = {
  searchText: string;
  onSearchChange: (searchText: string) => void;
  onCloseClick: () => void;
};
export default function NavbarSearch({
  searchText,
  onSearchChange,
  onCloseClick,
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
            ref={searchRef}
            onKeyDown={handleKeydown}
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            type="text"
            className="w-full py-2 pl-12 pl-3 rounded-lg bg-gray-200 text-gray-900 outline-none focus:bg-gray-300 focus:border-gray-400"
            placeholder="Search for tracks..."
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
