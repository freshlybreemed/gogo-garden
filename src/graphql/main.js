require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const { MongoClient } = require('mongodb');

let db;

const url = process.env.MONGODB_URL;
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect(function (err) {
  console.log('MONGOdb connected');
  db = client.db('music'); //mongodb database name
});
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
const resolvers = {
  Query: {
    artists: () => artists,
    // songs: () => music,
    songs: async () => {
      const values = await db
        .collection('garden')
        .find()
        .toArray()
        .then((res) => {
          return res;
        });
      return values;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const app = express();
server.applyMiddleware({ app });

app.listen({ port: 4000 }, () =>
  console.log(
    `🚀 Server ready at http://localhost:4000${server.graphqlPath}`,
  ),
);
