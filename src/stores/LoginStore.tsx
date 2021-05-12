import create from 'zustand';

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
  setLoading: () => void;
  setError: (text: string) => void;
}

export const useLoginStore = create<LoginStore>((set,get) => ({
  email: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  loading: false,
  password: '',
  error: '',
  setFirstName: (text: string) => set({firstName: text}),
  setEmail: (text: string) => set({email: text}),
  setPhoneNumber: (text: string) => set({phoneNumber: text}),
  setLastName: (text: string) => set({lastName: text}),
  setPassword: (text: string) => set({password: text}),
  setLoading: () => set({loading: !get().loading}),
  setError: (text: string) => set({error: text}),
}))