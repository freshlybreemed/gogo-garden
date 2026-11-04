import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/stores/AppStore';
import { useLoginStore } from '@/stores/LoginStore';

export function useSignUpContainer() {
  const form = useLoginStore(useShallow((state) => state));
  const setScreen = useAppStore((state) => state.setScreen);
  return { ...form, setScreen };
}
