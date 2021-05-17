import { useAppStore } from './stores/AppStore';
import { useNavbarStore } from './stores/NavigationStore';

export const useAppContainer = () =>{
    const screen = useAppStore((state) => state.screen);
    const setScreen = useAppStore((state) => state.setScreen);
    const searchText = useNavbarStore((state) => state.searchText);
    const setSearchText = useNavbarStore((state) => state.setSearchText);
 
    return {
      screen,
      setScreen,
      setSearchText,
      searchText
    }
}