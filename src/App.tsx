import './App.css';
import React, { useState } from 'react';
import Library from './components/library';
import Player from './components/player';
import Navigation from './components/navigation';

export default function App() {
  const [searchText, setSearchText] = useState<string>('');

  // const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   e.preventDefault();
  //   const songs = e.target.files;
  //   if(songs){
  //     for(var i = 0;i<songs.length; i++){
  //       let tempSong = songs[i]
  //       jsmediatags.read(tempSong, {
  //         onSuccess: (tag: any) => {
  //           const { tags: { artist, album } } = tag;
  //           const song: File = { ...tempSong, artist, album }
  //           console.log(song);
  //           setSelectedFiles([...selectedFiles, song]);
  //         },
  //         onError: (error) => {
  //           console.log(error);
  //         },
  //       });
  //     }
  //   }
  //   console.log(selectedFiles);
  // };

  // const uploadSong = async (
  //   e: React.MouseEvent<HTMLInputElement, MouseEvent>,
  // ) => {
  //   e.preventDefault();
  //   selectedFiles.forEach((song: any) => {
  //     Storage.put(`${song.artist}/${song.album}/${song.name}`, song, {
  //       progressCallback(progress: any) {
  //         console.log(
  //           `Uploaded: ${Math.floor(
  //             (progress.loaded / progress.total) * 100,
  //           )}%`,
  //         );
  //       },
  //     })
  //       .then((result) => {
  //         console.log(result);
  //       })
  //       .catch((err) => {
  //         console.error(err);
  //       });
  //   });
  //   console.log('done');
  // };

  return (
    <div className="flex flex-col h-full text-gray-900">
      <Navigation
        searchText={searchText}
        onSearchChange={setSearchText}
        onSearchClose={() => setSearchText('')}
      />
      {/* <form id="upload-form">
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
      */}
      <Library filterText={searchText} />
      <Player />
    </div>
  );
}
