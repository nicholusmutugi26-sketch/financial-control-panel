import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: "ADMIN" | "USER"
    isApproved: boolean
    image?: string | null
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      role: "ADMIN" | "USER"
      isApproved: boolean
      image?: string | null
    } & DefaultSession["user"]
  }

  interface JWT {
    id: string
    role: "ADMIN" | "USER"
    isApproved: boolean
    image?: string | null
  }
}
