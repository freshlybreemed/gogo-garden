import React from 'react';
import PropTypes from 'prop-types';
import ClientLibrary from '../playback/ClientLibrary'
import styled from '@emotion/styled'

const Table = styled.table`
  text-align:left
`
const Header = styled.thead`
  /* text-align:left */
`
const Row = styled.tr`
  /* text-align:left */
  cursor:pointer;
  &:hover {
    color: white;
    background:#23a0c0;
  }
`

const client = new ClientLibrary()

interface Song extends Object {
    artist: string;
    album: string;
    url: string;
    readonly lastModified: number;
    readonly name: string;
}

interface Props {
  library: Song[]
}


const App = (props: Props) => {

  const { library } = props
  return (
    <Table cellSpacing="0">
      <thead>
        <tr>
          <td>Artist</td>
          <td>Album</td>
          <td>Song</td>
        </tr>
      </thead>
      <tbody>
       {library.map((eachSong: any, ind: number) => {
            const song = eachSong.key.split('/');
            const album = song[1];
            const artist = song[0];
            const title = song[2];
            return (
              <Row data-url={`https://gogogarden191046-dev.s3.amazonaws.com/public/${artist}/${album}/${title}`} key={ind} onClick={client.setNowPlaying}>
                <td>{artist}</td>
                <td>{album}</td>
                <td>{title}</td>
              </Row>
            );
          })}
      </tbody>
    </Table>
  )
}

export default App;
