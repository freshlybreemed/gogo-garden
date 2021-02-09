import './App.css';
import React, { useState } from 'react';
import Library from './components/library';
import Player from './components/player';
import Navigation from './components/navigation';

export default function App() {
  const [searchText, setSearchText] = useState<string>('');
  return (
    <div className="flex flex-col h-full text-gray-900">
      <Navigation
        searchText={searchText}
        onSearchChange={setSearchText}
        onSearchClose={() => setSearchText('')}
      />
      <Library filterText={searchText} />
      <Player />
    </div>
  );
}
