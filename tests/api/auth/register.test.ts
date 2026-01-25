import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the prisma import used by the route handler
const users: any[] = []

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: async ({ where }: any) => users.find(u => u.email === where.email) || null,
        findFirst: async ({ where }: any) => users.find(u => u.phoneNumber === where.phoneNumber) || null,
        count: async () => users.length,
        create: async ({ data, select }: any) => {
          const id = `test-${users.length + 1}`
          const user = { id, ...data, createdAt: new Date().toISOString() }
          users.push(user)
          // mimic select projection used in route
          const picked: any = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
          }
          return picked
        },
      },
      auditLog: {
        create: async () => ({})
      }
    }
  }
})

// Import the route handler after mocking prisma
import { POST } from '../../../app/api/auth/register/route'

beforeEach(() => {
  // reset users array
  users.length = 0
})

describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    const payload = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phoneNumber: '254712345678',
    }

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.user).toBeDefined()
    expect(json.user.email).toBe(payload.email)
  })

  it('returns 400 for duplicate email', async () => {
    // create existing user
    users.push({ id: 'test-1', name: 'Existing', email: 'dup@example.com', phoneNumber: '254700000000', password: 'x', role: 'USER', createdAt: new Date().toISOString() })

    const payload = {
      name: 'Dup User',
      email: 'dup@example.com',
      password: 'password123',
      phoneNumber: '254711111111',
    }

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
  })

  it('returns 400 for validation error (bad phone)', async () => {
    const payload = {
      name: 'Bad Phone',
      email: 'badphone@example.com',
      password: 'password123',
      phoneNumber: '0712345678', // invalid format
    }

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
  })
})
