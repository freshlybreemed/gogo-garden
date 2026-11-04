import { create } from 'zustand';

export type LoginStore = {
  email: string;
  firstName: string;
  lastName: string;
  loading: boolean;
  phoneNumber: string;
  password: string;
  error: string;
  setPhoneNumber: (text: string) => void;
  setFirstName: (text: string) => void;
  setLastName: (text: string) => void;
  setEmail: (text: string) => void;
  setPassword: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (text: string) => void;
};

export const useLoginStore = create<LoginStore>((set) => ({
  email: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  loading: false,
  password: '',
  error: '',
  setFirstName: (text) => set({ firstName: text }),
  setEmail: (text) => set({ email: text }),
  setPhoneNumber: (text) => set({ phoneNumber: text }),
  setLastName: (text) => set({ lastName: text }),
  setPassword: (text) => set({ password: text }),
  setLoading: (loading) => set({ loading }),
  setError: (text) => set({ error: text }),
}));
