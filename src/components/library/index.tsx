import { useLibraryContainer } from './LibraryContainer'
import React from 'react'
import { Library } from './Library'
import {match} from '../../workers/match'

type Props = {
  filterText?: string;
}

export default function TrackList({filterText = ""}: Props){
  const {
    activate,
    currentTrackId,
    onTrackClick,
    onRandomClick,
    filteredTracks
  } = useLibraryContainer(filterText)

  return (
    <React.Fragment>
      {match(activate, {
        pending: () => <div>Loading</div>,
        rejected: () => <div>Failure moe</div>,
        resolved: () => <Library  
                            tracks={filteredTracks}
                      onTrackClick={onTrackClick}
                      currentTrackId={currentTrackId}
                      onRandomClick={onRandomClick}
                      filterText={filterText}
                      />,
      })}
    </React.Fragment>
  )
}