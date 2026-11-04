import { useEffect } from 'react';
import type { FixedSizeList } from 'react-window';

export default function useFocusReactWindowItem(
  listRef: React.RefObject<FixedSizeList | null>,
  index: number,
) {
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [index, listRef]);
}
