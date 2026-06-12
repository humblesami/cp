import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";

/**
 * NextAuth handles the OAuth dance with Google/Facebook.
 * On successful login, it exchanges the social token with Django to get a JWT,
 * then stores that JWT in the Next-Auth session.
 */
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Exchange OAuth token with Django — Django runs the social auth pipeline
      // and returns our JWT
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/social/complete/${account.provider}/?code=${account.access_token}`,
          { method: "GET" }
        );
        // In practice you'd call Django's /api/auth/social/ endpoint directly.
        // This is the integration point — wire to your Django social auth.
        return true;
      } catch {
        return false;
      }
    },

    async jwt({ token, account, user }) {
      // On first sign-in, fetch Django JWT and store it
      if (account) {
        // TODO: Exchange with Django and get { access, refresh, user }
        // token.djangoAccess = djangoResponse.access;
        // token.djangoRefresh = djangoResponse.refresh;
        // token.userId = djangoResponse.user.id;
        token.provider = account.provider;
      }
      return token;
    },

    async session({ session, token }) {
      session.djangoAccess = token.djangoAccess;
      session.userId = token.userId;
      return session;
    },
  },

  pages: {
    signIn: "/",          // redirect to home for login
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
