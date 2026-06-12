import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import jwt from "jsonwebtoken";
import { query } from "../../../../lib/pg_db";

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
      try {
        let email = user.email || "";
        let rawUsername = email ? email.split("@")[0] : "";
        if (!rawUsername && user.name) {
          rawUsername = user.name.replace(/\s+/g, "").toLowerCase();
        }
        
        // Fallback for length < 3
        if (!rawUsername || rawUsername.length < 3) {
          rawUsername = "user_" + Math.random().toString(36).substring(2, 6);
        }
        
        // Copy one to another if one is missing
        if (!email) {
          email = `${rawUsername}@courtpiece.local`;
        }
        
        const username = rawUsername.substring(0, 150);
        const avatarUrl = user.image || "";

        // Insert or update player in Django's users_user table
        const sql = `
          INSERT INTO users_user (
            username, email, password, first_name, last_name, 
            is_superuser, is_staff, is_active, date_joined, 
            avatar_url, total_matches, wins, losses
          )
          VALUES ($1, $2, '', $3, $4, false, false, true, NOW(), $5, 0, 0, 0)
          ON CONFLICT (username) 
          DO UPDATE SET avatar_url = EXCLUDED.avatar_url, email = EXCLUDED.email
          RETURNING id;
        `;

        const res = await query(sql, [
          username,
          email,
          user.name ? user.name.split(" ")[0] : "",
          user.name ? user.name.split(" ").slice(1).join(" ") : "",
          avatarUrl,
        ]);

        if (res.rows.length > 0) {
          // Attach the database ID to the user object for the jwt callback
          user.id = res.rows[0].id;
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error signing in user to Postgres:", err);
        return false;
      }
    },

    async jwt({ token, account, user }) {
      if (user) {
        token.userId = user.id;
        token.provider = account.provider;

        token.djangoAccess = jwt.sign(
          { user_id: user.id, username: token.name }, // Changed to user_id
          process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
          { expiresIn: "30d" } // Matches your "stay logged in" requirement
        );
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
    signIn: "/",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
