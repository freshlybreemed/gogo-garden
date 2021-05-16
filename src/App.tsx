import './App.css';
import React from 'react';
import Library from './components/library';
import Player from './components/player';
import Navigation from './components/navigation';
import { useAppContainer } from './AppContainter';
import Login from './components/login';
import SignUp from './components/signup';

export default function App() {

  const {screen, setScreen, setSearchText, searchText} = useAppContainer();
  return (
  <React.StrictMode>
      <div className="flex flex-col h-full text-white font-semibold">
        <Navigation
          searchText={searchText}
          onSearchChange={setSearchText}
          onSearchClose={() => setSearchText('')}
          />
        {screen !== 'login' && screen !== 'signup' && <Library filterText={searchText} />}
    
        <Player filterText={searchText} />
        {screen === 'login' && <Login />}
        {screen === 'signup' && <SignUp />}
      </div>
  </React.StrictMode>
  );
}
