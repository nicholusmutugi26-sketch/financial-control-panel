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

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user.role || 'USER') as 'ADMIN' | 'USER',
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
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.isApproved = (user as any).isApproved
        // include image when present on initial sign-in
        if ((user as any).image) token.image = (user as any).image
        console.log('JWT callback - Initial login:', {
          userId: token.id,
          email: token.email,
          role: token.role,
          isApproved: token.isApproved,
        })
      } else if (token.id) {
        // On every token refresh, fetch the latest data from DB
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
          if (dbUser) {
            // Enforce strict role assignment based on database
            let newRole: "ADMIN" | "USER" = "USER"
            if (dbUser.email === 'admin@financialpanel.com' || dbUser.role === 'ADMIN') {
              newRole = 'ADMIN'
            }
            
            token.role = newRole
            token.isApproved = dbUser.isApproved
            console.log('JWT callback - Token refresh:', {
              userId: token.id,
              email: dbUser.email,
              dbRole: dbUser.role,
              enforceRole: newRole,
              isApproved: dbUser.isApproved,
            })
          }
        } catch (e) {
          console.error('JWT callback error:', e)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "ADMIN" | "USER"
        ;(session.user as any).isApproved = token.isApproved as boolean
        
        // Refresh user data from database on each session to get latest role and approval status
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
          if (dbUser) {
            // Enforce strict role assignment based on database
            let finalRole: "ADMIN" | "USER" = "USER"
            if (dbUser.email === 'admin@financialpanel.com' || dbUser.role === 'ADMIN') {
              finalRole = 'ADMIN'
            }
            
            session.user.role = finalRole
            ;(session.user as any).isApproved = dbUser.isApproved
            session.user.image = dbUser.profileImage || (token as any).image || null
            console.log('Session callback - Updated from DB:', {
              userId: token.id,
              email: dbUser.email,
              dbRole: dbUser.role,
              finalRole: finalRole,
              isApproved: dbUser.isApproved,
            })
          }
        } catch (e) {
          console.error('Session callback error:', e)
          session.user.image = (token as any).image || null
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // After login, redirect to dashboard root
      // The dashboard page will handle role-based routing based on session.user.role
      if (url === baseUrl) {
        return `${baseUrl}/dashboard`
      }
      return url
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