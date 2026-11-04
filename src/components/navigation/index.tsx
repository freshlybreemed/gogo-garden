'use client';

import clsx from 'clsx';
import NavSearch from './NavSearch';
import { IconSearch } from '../icons';
import Logo from './Logo';
import { useNavigationContainer } from './NavigationContainer';
import { AUTH_COOKIE, removeCookie } from '@/lib/helpers';
import { logout } from '@/lib/firebase';

type Props = {
  searchText: string;
  onSearchClose: () => void;
  setSearchText: (searchText: string) => void;
};

// Were styled-components `SearchBar` / `UserBlock` divs.
const searchBarStyle: React.CSSProperties = {
  background: '#FFFFFF80 0% 0% no-repeat padding-box',
  border: '2px solid #FFFFFF',
  borderRadius: '30px',
  opacity: 0.2,
  width: '100%',
};

const userBlockStyle: React.CSSProperties = {
  background: '#FFFFFF26 0% 0% no-repeat padding-box',
  borderRadius: '30px',
  opacity: 1,
};

export default function Navbar({ searchText }: Props) {
  const { loggedIn, searchOpen, closeSearch, openSearch, setScreen, setSearchText } =
    useNavigationContainer();

  const handleLogout = () => {
    removeCookie(AUTH_COOKIE);
    void logout();
  };

  return (
    <div className="px-4 py-3 shadow-md flex items-center">
      <div
        className={clsx('flex', 'items-center', searchOpen && 'hidden sm:flex')}
        onClick={() => {
          setSearchText('');
          setScreen('home');
        }}
      >
        <Logo />
      </div>
      <div className="flex items-center sm:ml-6 w-full justify-end">
        {searchOpen ? (
          <NavSearch
            searchText={searchText}
            onCloseClick={closeSearch}
            setSearchText={setSearchText}
            openSearch={openSearch}
          />
        ) : (
          <div style={searchBarStyle} onClick={openSearch}>
            <SearchButton onClick={openSearch} />
          </div>
        )}
      </div>
      {loggedIn ? (
        // Full reload back to "/", as before.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/" onClick={handleLogout}>
          Logout
        </a>
      ) : (
        <div style={userBlockStyle} onClick={() => setScreen('login')}>
          Login
        </div>
      )}
    </div>
  );
}

type SearchButtonProps = {
  onClick: () => void;
};
function SearchButton({ onClick }: SearchButtonProps) {
  return (
    <button
      className="float-right flex p-2 hover:bg-gray-200 rounded-full focus:outline-none"
      onClick={() => onClick()}
    >
      <IconSearch className="fill-current w-6 h-6"></IconSearch>
    </button>
  );
}
