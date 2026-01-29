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
          const validatedCredentials = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email: validatedCredentials.email }
          })

          if (!user) {
            throw new Error("No user found with this email")
          }

          if (!user.password) {
            throw new Error("User password not set")
          }

          const isValidPassword = await bcrypt.compare(
            validatedCredentials.password,
            user.password
          )

          if (!isValidPassword) {
            throw new Error("Invalid password")
          }

          // Update last login and auto-approve users on first login
          // This allows users to access the dashboard immediately
          const isAdmin = user.email === 'admin@financialpanel.com'
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastLogin: new Date(),
              isApproved: true // Auto-approve all users on successful login
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user.email === 'admin@financialpanel.com' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
            isApproved: user.isApproved,
            image: user.profileImage,
          } as any
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial login - set basic user info
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.isApproved = (user as any).isApproved
        if ((user as any).image) token.image = (user as any).image

        // CRITICAL: Always enforce role based on email, never trust user input
        token.role = user.email === 'admin@financialpanel.com' ? 'ADMIN' : 'USER'

        console.log('JWT callback - Initial login:', {
          userId: token.id,
          email: token.email,
          enforcedRole: token.role,
          isApproved: token.isApproved,
        })
        
        return token
      }
      
      // Always ensure token has a role, even on subsequent calls
      if (!token.role && token.email) {
        token.role = token.email === 'admin@financialpanel.com' ? 'ADMIN' : 'USER'
        console.log('JWT callback - Enforced role from email:', {
          userId: token.id,
          email: token.email,
          role: token.role
        })
      }
      
      if (token.id) {
        // Token refresh - always re-validate role from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { email: true, isApproved: true, role: true }
          })

          if (dbUser) {
            // SECURITY: Role is ALWAYS determined by email, never by stored role
            const enforcedRole = dbUser.email === 'admin@financialpanel.com' ? 'ADMIN' : 'USER'

            token.role = enforcedRole
            token.isApproved = dbUser.isApproved
            token.email = dbUser.email

            console.log('JWT callback - Token refresh:', {
              userId: token.id,
              email: dbUser.email,
              dbRole: dbUser.role,
              enforcedRole: enforcedRole,
              isApproved: dbUser.isApproved,
            })
          } else {
            // User no longer exists - but still return token to avoid JWT errors
            // Session callback will handle the validation
            console.warn('JWT callback - User not found, keeping token:', token.id)
          }
        } catch (e) {
          console.error('JWT callback error:', e)
          // On database error, keep token - session callback will handle validation
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        // SAFETY FIRST: Always ensure these basic fields exist
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        
        // ALWAYS set role from token first (it should already have it from JWT callback)
        session.user.role = (token.role as 'ADMIN' | 'USER') || 'USER'

        console.log('Session callback START:', {
          userId: session.user.id,
          email: session.user.email,
          tokenRole: token.role,
          timestamp: new Date().toISOString()
        })

        // CRITICAL: Always fetch latest data from database for proper role enforcement
        // This prevents session caching issues when switching between admin/user accounts
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { 
              email: true,
              name: true,
              isApproved: true,
              profileImage: true,
              role: true
            },
            // Add timeout to prevent hanging
          })

          if (dbUser) {
            // SECURITY: Role is ALWAYS determined by email, never by stored role
            // This is critical for switching accounts without cache issues
            const enforcedRole = dbUser.email === 'admin@financialpanel.com' ? 'ADMIN' : 'USER'
            
            session.user.role = enforcedRole
            session.user.email = dbUser.email
            session.user.name = dbUser.name || session.user.name
            session.user.image = dbUser.profileImage || (token.image as string) || null
            ;(session.user as any).isApproved = dbUser.isApproved

            console.log('Session callback SUCCESS - DB refresh:', {
              userId: session.user.id,
              email: dbUser.email,
              dbRole: dbUser.role,
              enforcedRole: enforcedRole,
              isApproved: dbUser.isApproved,
              timestamp: new Date().toISOString()
            })
          } else {
            // User not found in DB - FALLBACK to token role
            console.warn('Session callback - User not found in DB, using token role:', {
              userId: token.id,
              tokenRole: token.role
            })
            session.user.role = (token.role as 'ADMIN' | 'USER') || 'USER'
          }
        } catch (e) {
          // DB error - FALLBACK to token role (critical for session to work)
          console.error('Session callback - DB error:', e)
          console.warn('Session callback - Using token role as fallback:', {
            userId: token.id,
            tokenRole: token.role,
            error: (e as Error).message
          })
          // Keep the role from token - this is critical to prevent session failure
          session.user.role = (token.role as 'ADMIN' | 'USER') || 'USER'
          session.user.image = (token.image as string) || null
          ;(session.user as any).isApproved = token.isApproved as boolean
        }

        // FINAL SAFETY CHECK: Ensure role is valid
        if (!session.user.role || (session.user.role !== 'ADMIN' && session.user.role !== 'USER')) {
          console.error('Session callback - INVALID ROLE, forcing USER:', {
            userId: session.user.id,
            invalidRole: session.user.role
          })
          session.user.role = 'USER'
        }

        console.log('Session callback END:', {
          userId: session.user.id,
          email: session.user.email,
          finalRole: session.user.role,
          timestamp: new Date().toISOString()
        })
      } else {
        // Invalid session - should not happen
        console.error('Session callback - Invalid session/token combination')
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard root which handles role-based routing
      console.log('[Redirect callback]', { url, baseUrl })
      return `${baseUrl}/dashboard`
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