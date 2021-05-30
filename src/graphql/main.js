
require('dotenv').config();
const {  gql } = require('apollo-server-micro');
const { defaults } = require('lodash');
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
    date: String
    artist: String
    artistId: String
  }
  type Song {
    _id: String
    artistId: String
    url: String
    duration: Float
    artist: String
    title: String
    album: String
    date: String
    streams: Float
    lastModified: String
    key: String
  }

  type Query {
    artists: [Artist]
    songs: [Song]
    albums: [Song]
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
  },
};

module.exports = {
  typeDefs,
  resolvers
}

