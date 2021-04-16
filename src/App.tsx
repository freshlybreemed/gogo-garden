import './App.css';
import React, { useState } from 'react';
import Library from './components/library';
import Player from './components/player';
import Navigation from './components/navigation';
import { gql, useQuery } from '@apollo/client';

export default function App() {
  const GET_SONGS = gql`
  query {
    songs{ 
      artist
    }
  }`;
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
        <Library filterText={searchText} />
        <Player filterText={searchText} />
      </div>
  </React.StrictMode>
  );
}
