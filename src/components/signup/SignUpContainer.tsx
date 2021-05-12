import { useAppStore } from '../../stores/AppStore';
import { useLoginStore } from '../../stores/LoginStore';

export function useSignUpContainer() {
  const email = useLoginStore(state => state.email)
  const firstName = useLoginStore(state => state.firstName);
  const lastName = useLoginStore(state => state.lastName);
  const phoneNumber = useLoginStore(state => state.phoneNumber);
  const loading = useLoginStore(state => state.loading);
  const password = useLoginStore(state => state.password);
  const error = useLoginStore(state => state.error);
  const setFirstName = useLoginStore(state => state.setFirstName);
  const setEmail = useLoginStore(state => state.setEmail);
  const setLastName = useLoginStore(state => state.setLastName);
  const setPassword = useLoginStore(state => state.setPassword);
  const setPhoneNumber = useLoginStore(state => state.setPhoneNumber);
  const setLoading = useLoginStore(state => state.setLoading);
  const setError = useLoginStore(state => state.setError);
  const setScreen = useAppStore(state => state.setScreen);

  return {
    email,
    firstName,
    lastName,
    loading,
    password,
    phoneNumber,
    error,
    setEmail,
    setScreen,
    setFirstName,
    setLastName,
    setPassword,
    setPhoneNumber,
    setLoading,
    setError,
  }
}
