import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const sql = getDb();
        const rows = await sql`
          SELECT * FROM users WHERE email = ${credentials.email}
        `;
        const user = rows[0];
        if (!user) return null;

        // Check bcrypt hash first, then fall back to plaintext column
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) {
          if (!user.password_plain || credentials.password !== user.password_plain) return null;
        }

        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
