import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

// Use internal Docker network URL for server-side auth, fallback to public URL
const API_BASE_URL = process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[NextAuth] authorize called with:', { 
          username: credentials?.username,
          hasPassword: !!credentials?.password,
          API_BASE_URL 
        });
        
        if (!credentials?.username || !credentials?.password) {
          console.log('[NextAuth] Missing credentials');
          return null;
        }

        try {
          // Create form data for OAuth2 password flow
          const formData = new URLSearchParams();
          formData.append('username', credentials.username as string);
          formData.append('password', credentials.password as string);

          console.log('[NextAuth] Calling backend:', `${API_BASE_URL}/api/v1/auth/login`);
          
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });

          console.log('[NextAuth] Login response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.log('[NextAuth] Login failed:', errorText);
            return null;
          }

          const tokens = await response.json();

          // Get user info with access token
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });

          if (!userResponse.ok) {
            return null;
          }

          const user = await userResponse.json();

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.full_name || user.username,
            username: user.username,
            role: user.role,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.username = user.username;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }: any) {
      // Send properties to the client
      session.user.id = token.sub!;
      session.user.username = token.username as string;
      session.user.role = token.role as string;
      session.accessToken = token.accessToken as string;

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },
  secret: process.env.NEXTAUTH_SECRET,
};
