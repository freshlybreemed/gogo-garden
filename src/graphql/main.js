
require('dotenv').config();
const {  gql } = require('apollo-server-micro');
const { defaults } = require('lodash');
const { default: db } = require('./db');
const connect = require('./db');

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Artist {
    id: String
    name: String
    shortName: String
    description: String
    image: String
    useShortName: Boolean
    imageUrl: String
    instagram: String
    twitter: String
    youtube: String
    founded: String
  }

  type Album {
    name: String
    artist: String
    artistId: String
    imageUrl: String
  }

  type Song {
    _id: String
    artistId: String
    url: String
    duration: Float
    artist: String
    title: String
    album: String
    imageUrl: String
    trackNumber: String
    date: String
    streams: Float
    lastModified: String
    key: String
  }

  type Query {
    artists: [Artist]
    songs: [Song]
    albums(artistId:String): [Album]
  }

  input User {
    email: String
    id: String
  }
  type Mutation {
    login: [Artist]
    signup: [Song]
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    artists: async () => {
      const db = await connect();
      return await db.collection('bands').find().toArray()
    },
    songs: async () => {
      const db = await connect();
      return await db.collection('music').find().toArray()
    },

    albums: async (root, args) => {
      const db = await connect();
      const music =  await db.collection('music').find().toArray();
      const artistSongs = music.filter((song) => {
        return `${song.artistId}` === args.artistId
      });
      const albums = {};
      artistSongs.forEach(song => {
        if(!albums[song.album]){
          let albumObj = {
            name: song.album,
            artist: song.artist,
            artistId: song.artistId,
            imageUrl: song.imageUrl
          }
          albums[song.album] = albumObj
        }
      })
      let albumsResult = Object.values(albums);
      return albumsResult;
    }
  },
  Mutation:{
    login: async (user) => {
      const db = await connect();
      return await db.collection('user').updateOne(
        { id: user.id },
        {
          $set: { updatedAt: new Date() },
        },
        );
      },
      signup: async (user) => {
      const db = await connect();
      return await db.collection('user').updateOne(
        { _id: user.id },
        {
          $set: { ...user, updatedAt: new Date() },
        },
        { upsert: true, returnOriginal: false },
      );
    },
  },
};

module.exports = {
  typeDefs,
  resolvers
}

