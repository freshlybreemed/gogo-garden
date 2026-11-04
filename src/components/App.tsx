'use client';

import Library from './library';
import Player from './player';
import Navigation from './navigation';
import Login from './login';
import SignUp from './signup';
import { useAppStore } from '@/stores/AppStore';
import { useNavbarStore } from '@/stores/NavigationStore';

export default function App() {
  const screen = useAppStore((state) => state.screen);
  const searchText = useNavbarStore((state) => state.searchText);
  const setSearchText = useNavbarStore((state) => state.setSearchText);

  return (
    <div className="flex flex-col h-full text-white font-semibold">
      <Navigation
        searchText={searchText}
        setSearchText={setSearchText}
        onSearchClose={() => setSearchText('')}
      />
      {screen !== 'login' && screen !== 'signup' && <Library filterText={searchText} />}

      <Player filterText={searchText} />
      {screen === 'login' && <Login />}
      {screen === 'signup' && <SignUp />}
    </div>
  );
}
