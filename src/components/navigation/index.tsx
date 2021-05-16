import React from 'react';
import NavSearch from './NavSearch';
import { cx } from '@emotion/css';
import { IconSearch } from '../icons';
import Logo from './Logo';
import { useNavigationContainer } from './NavigationContainer';
import { removeCookie } from '../../helpers';
import styled from 'styled-components';

type Props = {
  searchText: string;
  onSearchClose: () => void;
  onSearchChange: (searchText: string) => void;
};

const SearchBar = styled.div`
background: #FFFFFF80 0% 0% no-repeat padding-box;
border: 2px solid #FFFFFF;
border-radius: 30px;
opacity: 0.2;
width:100%;
`;

const UserBlock = styled.div`
background: #FFFFFF26 0% 0% no-repeat padding-box;
border-radius: 30px;
opacity: 1;
`
const UserImage = styled.div`
background: transparent url('./images/logo192.png') 0% 0% no-repeat padding-box;
border-radius: 30px;
opacity: 1;
`
export default function Navbar({
  searchText,
  onSearchChange,}: Props) {
  
  const { loggedIn, searchOpen, closeSearch, openSearch, setScreen, setSearchText } = useNavigationContainer()

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
          onClick={()=>{
            setSearchText('')
            setScreen('home');
          }}
        >
          <Logo />
        </div>
        <div className="flex items-center ml:auto sm:ml-6 w-full justify-end">
          {searchOpen ? (
            <NavSearch
              searchText={searchText}
              onCloseClick={closeSearch}
              onSearchChange={onSearchChange}
              openSearch={openSearch}
            />
          ) : (<SearchBar onClick={openSearch}>
                <SearchButton onClick={openSearch}/>
              </SearchBar>
          )}
        </div>
        {loggedIn ? <a href="/" onClick={handleLogout}>Logout</a>:<UserBlock onClick={()=> setScreen('login')}>Login</UserBlock>}
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
      className="float-right flex p-2 hover:bg-gray-200 rounded-full focus:outline-none"
      onClick={() => onClick()}
    >
      <IconSearch className="fill-current w-6 h-6"></IconSearch>
    </button>
  );
}
