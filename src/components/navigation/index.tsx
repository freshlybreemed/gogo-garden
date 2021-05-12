import React, { useEffect } from 'react';
import NavSearch from './NavSearch';
import { cx } from '@emotion/css';
import { IconSearch } from '../icons';
import Logo from './Logo';
import { useNavigationContainer } from './NavigationContainer';
import { removeCookie } from '../../helpers';
import { setSeconds } from 'date-fns';

type Props = {
  searchText: string;
  onSearchClose: () => void;
  onSearchChange: (searchText: string) => void;
};

export default function Navbar({
  searchText,
  onSearchChange,
  onSearchClose,
}: Props) {
  
  const { loggedIn, searchOpen, closeSearch, openSearch, setScreen } = useNavigationContainer()
  useEffect(() => {
    if (!searchOpen) {
      onSearchClose();
    }
  }, [searchOpen, onSearchClose]);

  const handleLogout = () => {
    removeCookie('id_token');
  };

  return (
    <div className="px-4 py-3 shadow-md flex items-center">
      <React.Fragment>
        <div
          className={cx(
            'flex',
            'items-center',
            searchOpen && 'hidden sm:flex',
          )}
          onClick={()=>setScreen('home')}
        >
          <Logo />
        </div>
        <div className="flex items-center ml:auto sm:ml-6 w-full justify-end">
          {searchOpen ? (
            <NavSearch
              searchText={searchText}
              onCloseClick={closeSearch}
              onSearchChange={onSearchChange}
            />
          ) : (
            <SearchButton onClick={openSearch} />
          )}
        </div>
        {loggedIn ? <a href="/" onClick={handleLogout}>Logout</a>:<div onClick={()=>setScreen('login')}>Login</div>}
      </React.Fragment>
    </div>
  );
}

type SearchButtonProps = {
  onClick: () => void;
};
function SearchButton({ onClick }: SearchButtonProps) {
  return (
    <button
      className="p-2 hover:bg-gray-200 rounded-full focus:outline-none"
      onClick={() => onClick()}
    >
      <IconSearch className="fill-current w-6 h-6"></IconSearch>
    </button>
  );
}
