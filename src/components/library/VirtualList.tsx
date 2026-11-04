'use client';

import { useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import useFocusReactWindowItem from './useFocusReactWindowItem';

type Props<T> = {
  items: T[];
  focusIndex?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
};

/** The AutoSizer + FixedSizeList (90px rows) block shared by every library list. */
export function VirtualList<T>({ items, focusIndex = -1, renderItem }: Props<T>) {
  const listRef = useRef<List>(null);
  useFocusReactWindowItem(listRef, focusIndex);

  return (
    <div className="flex-auto">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            className="px-4 md:px-4"
            itemCount={items.length}
            itemSize={90}
            width={width}
            height={height}
          >
            {({ index, style }) => (
              <div className="w-full" style={style}>
                <div className="max-w-4xl m-auto">{renderItem(items[index], index)}</div>
              </div>
            )}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}
