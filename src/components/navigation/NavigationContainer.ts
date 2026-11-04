import { useAppData } from '../AppData';
import { useAppStore } from '@/stores/AppStore';
import { useNavbarStore } from '@/stores/NavigationStore';

export function useNavigationContainer() {
  const { initialLoggedIn } = useAppData();
  const searchOpen = useNavbarStore((state) => state.searchOpen);
  const setSearchText = useNavbarStore((state) => state.setSearchText);
  const setScreen = useAppStore((state) => state.setScreen);
  const openSearch = useNavbarStore((state) => state.openSearch);
  const storeLoggedIn = useAppStore((state) => state.loggedIn);
  const setLoggedIn = useAppStore((state) => state.setLoggedIn);
  const closeSearch = useNavbarStore((state) => state.closeSearch);

  return {
    searchOpen,
    openSearch,
    setScreen,
    loggedIn: storeLoggedIn ?? initialLoggedIn,
    closeSearch,
    setSearchText,
    setLoggedIn,
  };
}
