import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// This config is Edge-compatible (no Prisma/pg imports).
// Used by middleware. The full auth.ts adds the adapter for server-side use.
export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is handled in the full auth.ts
      authorize: () => null,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Protect admin routes
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        if (auth?.user?.role !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Protect user-only routes
      if (
        pathname.startsWith("/checkout") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/account")
      ) {
        return isLoggedIn;
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
