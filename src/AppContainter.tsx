import { useAppStore } from './stores/AppStore';

export const useAppContainer = () =>{
    const screen = useAppStore((state) => state.screen);
    const setScreen = useAppStore((state) => state.setScreen);
 
    return {
      screen,
      setScreen
    }
}