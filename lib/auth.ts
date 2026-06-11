import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      return profile?.email?.endsWith('@superscript.nyc') ?? false
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
