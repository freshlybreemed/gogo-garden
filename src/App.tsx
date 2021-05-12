import './App.css';
import React, { useState } from 'react';
import Library from './components/library';
import Player from './components/player';
import Navigation from './components/navigation';
import { gql, useQuery } from '@apollo/client';
import router from 'next/router';
import { useAppContainer } from './AppContainter';
import Login from './components/login';
import SignUp from './components/signup';

export default function App() {
  const GET_SONGS = gql`
  query {
    songs{ 
      artist
    }
  }`;
  const {screen, setScreen} = useAppContainer()
  const { loading, error, data } = useQuery(GET_SONGS);
  const [searchText, setSearchText] = useState<string>('');
  return (
  <React.StrictMode>
      <div className="flex flex-col h-full text-gray-900">
        <Navigation
          searchText={searchText}
          onSearchChange={setSearchText}
          onSearchClose={() => setSearchText('')}
          />
        {screen === 'home' &&  <Library filterText={searchText} />}
    
        <Player filterText={searchText} />
        {screen === 'login' && <Login />}
        {screen === 'signup' && <SignUp />}
      </div>
  </React.StrictMode>
  );
}
