import './App.css';
import Amplify, { Storage } from 'aws-amplify';
import React, { useState, useEffect } from 'react';
import jsmediatags from 'jsmediatags';
import logo from './logo.svg';
import awsExports from './aws-exports';
import Library from './components/library/Library';
import ClientLibrary from './components/playback/ClientLibrary';
import EventLibrary from './components/playback/EventLibrary';
import Player from './components/player/Player';

Amplify.configure(awsExports);

declare global {
    interface Window { 
      // clientLibrary: any; 
      // eventLibrary: any;
      audio: any;
    }
}
window.audio = new Audio()
// window.clientLibrary = new ClientLibrary()
// window.eventLibrary = new EventLibrary()



interface File extends Blob {
    artist: string;
    album: string;
    readonly lastModified: number;
    readonly name: string;
}

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [allSongs, setAllSongs] = useState([]);
  const [currSong, setCurrSong] = useState('')

  useEffect(() => {
    async function onLoad() {
      try {
        const songs = await Storage.list('');
        setAllSongs(songs);
        Storage.get('').then((result: any)=>{
          console.log(result)
          setCurrSong(result)
        })
        console.log(songs,allSongs);
      }
      catch (e) {
        alert(e);
      }
    }
    onLoad();
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const songs = e.target.files;
    if(songs){
      for(var i = 0;i<songs.length; i++){
        let tempSong = songs[i]
        jsmediatags.read(tempSong, {
          onSuccess: (tag: any) => {
            const { tags: { artist, album } } = tag;
            const song: File = { ...tempSong, artist, album }
            console.log(song);
            setSelectedFiles([...selectedFiles, song]);
          },
          onError: (error) => {
            console.log(error);
          },
        });
      }
    }
    console.log(selectedFiles);
  };

  const uploadSong = async (
    e: React.MouseEvent<HTMLInputElement, MouseEvent>,
  ) => {
    e.preventDefault();
    selectedFiles.forEach((song: any) => {
      Storage.put(`${song.artist}/${song.album}/${song.name}`, song, {
        progressCallback(progress: any) {
          console.log(
            `Uploaded: ${Math.floor(
              (progress.loaded / progress.total) * 100,
            )}%`,
          );
        },
      })
        .then((result) => {
          console.log(result);
        })
        .catch((err) => {
          console.error(err);
        });
    });
    console.log('done');
  };
  

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>GoGo Garden</h1>
        <form id="upload-form">
          <label className="custom-file-upload">
            <input
              onChange={handleChange}
              type="file"
              name="filename"
              id="file-upload"
              accept="audio/*"
              multiple
            />
            Select Files
          </label>
          <input type="submit" onClick={uploadSong} value="Upload" />
        </form>
      </header>
      <Player />
     <Library library={allSongs} />
    </div>
  );
}

export default App;
