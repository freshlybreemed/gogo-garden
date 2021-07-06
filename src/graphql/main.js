require('dotenv').config();
const { gql } = require('apollo-server-micro');
const { defaults } = require('lodash');
const { ObjectId } = require('mongodb');
const { testModeAPI } = require('react-ga');
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
  }

  type Query {
    artists: [Artist]
    songs: [Song]
    albums(artistId: String): [Album]
  }

  type Playlist {
    songs: [Song]!
    name: String
    likes: Float
    lastModified: String
  }

  type User {
    _id: String
    email: String
    firstName: String
    lastName: String
    phoneNumber: String
    password: String
    lastModified: String
    playlists: [Playlist]!
  }

  input SignupInput {
    email: String
    firstName: String
    lastName: String
    phoneNumber: String
    password: String
    lastModified: String
  }

  type MutationResult {
    result: String
  }

  type Mutation {
    login(email: String): MutationResult
    signup(input: SignupInput): MutationResult
    streamUp(songId: String): MutationResult
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    artists: async () => {
      const db = await connect();
      return await db.collection('bands').find().toArray();
    },
    songs: async () => {
      const db = await connect();
      return await db.collection('music').find().toArray();
    },

    albums: async (root, args) => {
      const db = await connect();
      const music = await db.collection('music').find().toArray();
      const artistSongs = music.filter((song) => {
        return `${song.artistId}` === args.artistId;
      });
      const albums = {};
      artistSongs.forEach((song) => {
        if (!albums[song.album]) {
          let albumObj = {
            name: song.album,
            artist: song.artist,
            artistId: song.artistId,
            imageUrl: song.imageUrl,
          };
          albums[song.album] = albumObj;
        }
      });
      let albumsResult = Object.values(albums);
      return albumsResult;
    },
  },
  Mutation: {
    streamUp: async (root, { songId }) => {
      try {
        const db = await connect();
        const incrementStream = db.collection('music').updateOne(
          { _id: new ObjectId(songId) },
          {
            $inc: { streams: 1 },
          },
        );
        const updateLastModified = db.collection('music').updateOne(
          { _id: new ObjectId(songId) },
          {
            $set: {
              lastModified: new Date(),
            },
          },
        );
        return { result: 'Stream incremented' };
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
        return { result: 'Unsucessful' };
      }
    },
    login: async (root, { email }) => {
      try {
        const db = await connect();
        const response = await db.collection('user').updateOne(
          { email: email },
          {
            $set: { lastModified: new Date() },
          },
        );
        return { result: 'Login successful' };
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
        return { result: 'Unsucessful' };
      }
    },
    signup: async (root, { input }) => {
      try {
        const db = await connect();
        const response = await db.collection('user').insertOne(input);
        return { result: 'Successfully entered into database' };
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
        return { result: 'Unsucessful' };
      }
    },
  },
};

module.exports = {
  typeDefs,
  resolvers,
};
