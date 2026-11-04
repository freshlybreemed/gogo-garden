import { useEffect, useState } from 'react';

export function useMedia(query: string, defaultMatches = true) {
  const [matches, setMatches] = useState(defaultMatches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', listener);
    setMatches(mediaQueryList.matches);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
