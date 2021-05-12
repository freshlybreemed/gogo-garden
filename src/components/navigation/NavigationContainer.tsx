import { useAppStore } from '../../stores/AppStore';
import { useNavbarStore } from '../../stores/NavigationStore';

export function useNavigationContainer() {

  const searchOpen = useNavbarStore((state) => state.searchOpen);
  const setScreen = useAppStore((state) => state.setScreen);
  const openSearch = useNavbarStore((state) => state.openSearch);
  const loggedIn = useAppStore((state) => state.loggedIn);
  const setLoggedIn = useAppStore((state) => state.setLoggedIn);
  const closeSearch = useNavbarStore((state) => state.closeSearch);

  return {
    searchOpen,
    openSearch,
    setScreen,
    loggedIn,
    closeSearch,
    setLoggedIn,
  }
  
}