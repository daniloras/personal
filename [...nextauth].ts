import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialProvider from 'next-auth/providers/credentials'
import graphql from 'services/graphQL'

import { LOGIN_USER } from 'modules/Auth/Login/gql'
import { LOGIN_USER_SOCIAL_PROVIDER } from 'gql/auth'

export default NextAuth({
  providers: [
    GoogleProvider({
      name: 'Google',
      clientId: String(process.env.GOOGLE_CLIENT_ID),
      clientSecret: String(process.env.GOOGLE_CLIENT_SECRET),
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    CredentialProvider({
      name: 'credentials',
      credentials: {
        username: {
          label: 'Email',
          type: 'text',
          placeholder: 'johndoe@test.com'
        },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (credentials: any) => {
        const { data } = await graphql.mutate({
          mutation: LOGIN_USER,
          variables: {
            email: credentials.username,
            password: credentials.password
          }
        })
        if (data.loginUser) {
          const { user, token } = data.loginUser
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar_url
          }
        }

        return null
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user, account, profile, session }: any) => {
      if (account.provider === 'google') {
        const { data } = await graphql.mutate({
          mutation: LOGIN_USER_SOCIAL_PROVIDER,
          variables: {
            name: profile.name,
            email: profile.email,
            provider: 'GOOGLE',
            provider_user_id: profile.sub,
            avatar_url: profile.picture
          }
        })

        if (data.loginUserSocialProvider) {
          const { user, token } = data.loginUserSocialProvider

          token.id = token

          // return {
          //   id: user.id,
          //   name: user.name,
          //   email: user.email,
          //   image: profile.picture,
          //   token: token
          // }
        }
      }
      if (user) {
        token.id = user.id
      }

      return token
    },
    session: ({ session, user }) => {
      if (session) {
        session.user = user

        return session
      }
      return Promise.resolve(session)
    }
  },
  secret: 'test',
  jwt: {
    secret: 'test',
    maxAge: 30 * 24 * 60 * 60
  },
  pages: {
    signIn: '/auth/login'
  }
})
