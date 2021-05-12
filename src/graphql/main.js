require('dotenv').config();
const {  gql } = require('apollo-server-micro');
const { MongoClient } = require('mongodb');
const connect = require('./db');

// Construct a schema, using GraphQL schema language
export const typeDefs = gql`
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

  type Song {
    id: String
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
  }
`;

// Provide resolver functions for your schema fields
export const resolvers = {
  Query: {
    artists: () => artists,
    songs: async () => {
       const db = await connect();
      return await db.collection('garden').find().toArray()
    },
  },
};



