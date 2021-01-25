import React, {useState} from 'react'
import ClientLibrary from '../playback/ClientLibrary'
import styled from '@emotion/styled'

const PlayerContainer = styled.div`
   height: 5vh;
  width: 100%;
    align-items: center;
    box-shadow: 1px 1px 3px;
    height: 100%;
    justify-content: space-between;
    padding-left: 0.5em;
    padding-right: 0.5em;

`
const client = new ClientLibrary()
const App = () => {

  const [searchText, setSearchText] = useState('')

  
  return (
    <div>
      <PlayerContainer>
        <div className="player__controls flex-row">
          <i className="player__symbol material-icons" onClick={()=>client.togglePausePlay()}>equalizer</i>
          <span className="player__text">Select a track to play.</span>
          <div className="progress__time"></div>
        </div>
        <div className="player__search flex-row">
          <i className="player__search__icon material-icons">search</i>
          <input placeholder="Search" value={searchText} onChange={(e)=>setSearchText(e.target.value)} onInput={()=>client.filterLibrary(searchText)} />
        </div>
      </PlayerContainer>

      <div className="progress progress__container">
        <div className="progress__bar">
          <div className="progress__cursor"></div>
        </div>
      </div>
    </div>
  )
}

export default App;