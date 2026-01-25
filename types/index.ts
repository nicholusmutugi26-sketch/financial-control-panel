import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "USER"
    } & DefaultSession["user"]
  }

  interface User {
    role: "ADMIN" | "USER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "ADMIN" | "USER"
  }
}

export type Budget = {
  id: string
  title: string
  description?: string
  amount: number
  allocatedAmount: number
  status: string
  priority: string
  disbursementType: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  user?: {
    name: string
    email: string
  }
  batches?: Batch[]
  _count?: {
    expenditures: number
  }
}

export type Batch = {
  id: string
  budgetId: string
  amount: number
  status: string
  disbursedAt?: Date
  createdAt: Date
}

export type Expenditure = {
  id: string
  title: string
  description?: string
  amount: number
  status: string
  priority: string
  budgetId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  items: ExpenditureItem[]
  user?: {
    name: string
    email: string
  }
  budget?: {
    title: string
  }
}

export type ExpenditureItem = {
  id: string
  expenditureId: string
  name: string
  description?: string
  amount: number
  createdAt: Date
}

export type Project = {
  id: string
  title: string
  description: string
  status: string
  budgetId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  votes: Vote[]
  user?: {
    name: string
    email: string
  }
  budget?: {
    title: string
  }
}

export type Vote = {
  id: string
  projectId: string
  userId: string
  vote: boolean
  comment?: string
  createdAt: Date
  user?: {
    name: string
  }
}

export type Transaction = {
  id: string
  type: string
  amount: number
  reference?: string
  status: string
  mpesaCode?: string
  phoneNumber: string
  userId: string
  budgetId?: string
  expenditureId?: string
  createdAt: Date
  user?: {
    name: string
    email: string
  }
  budget?: {
    title: string
  }
  expenditure?: {
    title: string
  }
}

export type Report = {
  id: string
  type: string
  period: string
  data: any
  createdBy: string
  createdAt: Date
}

export type DashboardStats = {
  totalBudget: number
  totalExpenditures: number
  pendingBudgets: number
  pendingExpenditures: number
  activeProjects: number
  availableBalance: number
  totalUsers?: number
  recentTransactions?: Transaction[]
}

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}