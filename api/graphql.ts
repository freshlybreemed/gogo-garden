import { ApolloServer } from 'apollo-server-micro'
import { typeDefs, resolvers  } from '../src/graphql/main';

export default new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true,
}).createHandler({
    path: '/api/graphql',
})
