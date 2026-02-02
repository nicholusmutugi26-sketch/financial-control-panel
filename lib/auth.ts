import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (reduced from 30 days)
    updateAge: 60 * 60, // 1 hour (reduced from 24 hours)
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours (reduced from 30 days)
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 hours (reduced from 30 days)
      },
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('🔐 [AUTH] authorize() called with credentials:', credentials ? { email: credentials.email, passwordLength: (credentials.password || '').length } : 'none')
          
          // Validate credentials structure
          if (!credentials) {
            console.error('🔐 [AUTH] ❌ No credentials provided')
            return null
          }

          const validatedCredentials = loginSchema.parse(credentials)
          console.log('🔐 [AUTH] ✓ Credentials validated:', { email: validatedCredentials.email })

          // Find user by email using case-insensitive filter
          const user = await prisma.user.findFirst({
            where: { email: { equals: validatedCredentials.email, mode: 'insensitive' } }
          })

          if (!user) {
            console.error('🔐 [AUTH] ❌ User not found:', validatedCredentials.email)
            return null
          }

          console.log('🔐 [AUTH] ✓ User found:', { id: user.id, email: user.email, hasPassword: !!user.password })

          // Ensure password is set
          if (!user.password || user.password.trim() === '') {
            console.error('🔐 [AUTH] ❌ User password not set for:', user.email)
            return null
          }

          // Compare passwords
          console.log('🔐 [AUTH] Comparing passwords...')
          const isValidPassword = await bcrypt.compare(
            validatedCredentials.password,
            user.password
          )

          if (!isValidPassword) {
            console.error('🔐 [AUTH] ❌ Invalid password for:', user.email)
            return null
          }

          console.log('🔐 [AUTH] ✓ Password valid')

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })

          const returnUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: ((user.email ?? '').toLowerCase() === 'admin@financialpanel.com' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
            isApproved: user.isApproved,
            image: user.profileImage,
          } as any

          console.log('🔐 [AUTH] ✓ User authorized successfully:', { id: returnUser.id, email: returnUser.email, role: returnUser.role })
          return returnUser
        } catch (error) {
          console.error('🔐 [AUTH] ❌ Authorization error:', error instanceof Error ? error.message : error)
          console.error('🔐 [AUTH] Full error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial login - set ALL required fields immediately
        console.log('🔐 [JWT] Initial login - setting token:', { userId: user.id, email: user.email })
        
        token.id = user.id
        token.email = user.email
        token.name = user.name || ''
        token.image = (user as any).image || null
        token.isApproved = (user as any).isApproved === true
        
        // CRITICAL: Always enforce role based on email, never trust user input
        const enforcedRole = ((user.email ?? '').toLowerCase() === 'admin@financialpanel.com' ? 'ADMIN' : 'USER')
        token.role = enforcedRole

        console.log('🔐 [JWT] ✓ Initial token created:', {
          userId: token.id,
          email: token.email,
          role: token.role,
          isApproved: token.isApproved,
          hasName: !!token.name,
        })
        
        return token
      }
      
      // Token already exists - ensure all fields are present and valid
      console.log('🔐 [JWT] Token refresh/subsequent call:', { tokenId: token.id, tokenEmail: token.email })
      
      // Safety: ensure all critical fields exist
      if (!token.id) {
        console.error('🔐 [JWT] ❌ Token has no ID - this should never happen')
        return token
      }

      // Always ensure email and role are set correctly
      if (!token.email) {
        console.error('🔐 [JWT] ❌ Token has no email')
        return token
      }

      // Always ensure role is derived from email, not stored
      if (!token.role || typeof token.role !== 'string') {
        const emailBasedRole = ((token.email as string).toLowerCase() === 'admin@financialpanel.com' ? 'ADMIN' : 'USER')
        token.role = emailBasedRole
        console.log('🔐 [JWT] Role recomputed from email:', emailBasedRole)
      }

      // Ensure isApproved is boolean
      if (typeof token.isApproved !== 'boolean') {
        token.isApproved = false
        console.log('🔐 [JWT] isApproved reset to false')
      }

      // Optionally refresh user data from database (but don't block on this)
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { email: true, isApproved: true, name: true, profileImage: true }
          })

          if (dbUser) {
            // Update token with fresh data
            token.email = dbUser.email
            token.name = dbUser.name || ''
            token.image = dbUser.profileImage || null
            token.isApproved = dbUser.isApproved === true
            
            // Always re-derive role from email
            token.role = ((dbUser.email ?? '').toLowerCase() === 'admin@financialpanel.com' ? 'ADMIN' : 'USER')

            console.log('🔐 [JWT] ✓ Refreshed from DB:', {
              email: dbUser.email,
              role: token.role,
              isApproved: token.isApproved,
            })
          } else {
            console.warn('🔐 [JWT] ⚠️  User not found in DB (might be deleted):', token.id)
          }
        } catch (e) {
          console.error('🔐 [JWT] DB error (non-blocking):', (e as Error).message)
          // Don't fail - keep existing token values
        }
      }

      console.log('🔐 [JWT] ✓ Returning token:', {
        hasId: !!token.id,
        hasEmail: !!token.email,
        hasRole: !!token.role,
        isApproved: token.isApproved,
      })
      
      return token
    },
    async session({ session, token }) {
      console.log('[SESSION] Starting callback...', {
        hasSession: !!session,
        hasToken: !!token,
        tokenId: token?.id,
        tokenEmail: token?.email,
        tokenRole: token?.role,
      })

      // CRITICAL: Must have both session and token
      if (!session || !session.user) {
        console.error('[SESSION] ❌ No session object')
        return session
      }

      if (!token) {
        console.error('[SESSION] ❌ No token')
        return session
      }

      // CRITICAL: Must have token ID and email
      if (!token.id || !token.email) {
        console.error('[SESSION] ❌ Token missing critical fields:', {
          hasId: !!token.id,
          hasEmail: !!token.email,
        })
        return session
      }

      // Set user fields from token (token is the source of truth)
      session.user.id = token.id as string
      session.user.email = token.email as string
      session.user.name = (token.name as string) || ''
      session.user.role = (token.role as 'ADMIN' | 'USER') || 'USER'
      ;(session.user as any).isApproved = token.isApproved === true

      console.log('[SESSION] ✓ Step 1 - Set from token:', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        isApproved: (session.user as any).isApproved,
      })

      // Validate role is valid
      if (session.user.role !== 'ADMIN' && session.user.role !== 'USER') {
        console.error('[SESSION] ❌ Invalid role from token, forcing USER:', session.user.role)
        session.user.role = 'USER'
      }

      // Validate isApproved is boolean
      if (typeof (session.user as any).isApproved !== 'boolean') {
        console.warn('[SESSION] ⚠️  isApproved not boolean, resetting')
        ;(session.user as any).isApproved = false
      }

      console.log('[SESSION] ✓ Callback complete:', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        isApproved: (session.user as any).isApproved,
      })

      return session
    },
    async redirect({ url, baseUrl }) {
      // CRITICAL FIX: Don't redirect on server side during authentication
      // The session cookies are not immediately available in the same request cycle
      // Let the client handle all redirects after confirming session is established
      // This prevents the redirect -> middleware check -> redirect loop
      
      console.log('[Redirect callback] Returning original URL (client will handle final redirect):', { url, baseUrl })
      
      // Return the original URL to avoid server redirect that races the session cookie
      // The browser will naturally stay on the page, and client-side code will handle navigation
      return url || baseUrl
    }
  },
  events: {
    async signIn({ user }) {
      await prisma.auditLog.create({
        data: {
          action: "SIGN_IN",
          entity: "USER",
          entityId: user.id,
          userId: user.id,
          changes: { timestamp: new Date().toISOString() }
        }
      })
    },
    async signOut({ token }) {
      if (token.sub) {
        // Clear any session-related caches
        await prisma.auditLog.create({
          data: {
            action: "SIGN_OUT",
            entity: "USER",
            entityId: token.sub,
            userId: token.sub,
            changes: { timestamp: new Date().toISOString() }
          }
        })
      }
    }
  }
}