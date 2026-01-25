Purpose
-------
Short, actionable guidance for an AI coding agent to become productive in this repository.

Quick Architecture Summary
--------------------------
- Framework: Next.js 14 (App Router). Top-level routes live under `app/` and are server components by default.
- Global layout: [app/layout.tsx](app/layout.tsx) composes `Providers` and the `Toaster`.
- Providers: [components/providers/Providers.tsx](components/providers/Providers.tsx) wires `next-auth` `SessionProvider`, a `QueryClient` and `SocketProvider` (client component).
- API: Route handlers are Next route handlers under `app/api/*`. Server DB access happens in these route handlers.
- Database: PostgreSQL with Prisma ORM. Use singleton from [lib/prisma.ts](lib/prisma.ts).
- Realtime: Socket.io server at [lib/realtime.ts](lib/realtime.ts), client in [components/providers/SocketProvider.tsx](components/providers/SocketProvider.tsx).

Key Architecture Patterns
-------------------------
- **Budgets are item-driven**: `BudgetItem` rows are authoritative; `Budget.amount` = sum of items. See [components/forms/CreateBudgetForm.tsx](components/forms/CreateBudgetForm.tsx) and [app/api/budgets/[id]/items/route.ts](app/api/budgets/[id]/items/route.ts).
- **Expenditures reference budget items**: Create `ExpenditureItem` rows with `spentAmount`. Server validates ownership. See [app/api/expenditures/route.ts](app/api/expenditures/route.ts).
- **Supplementary budgets**: When `spentAmount` > budget item price, create `SupplementaryBudget` (status PENDING) not instant approval. See [app/api/expenditures/route.ts](app/api/expenditures/route.ts).
- **Fund pool & remittances**: Admins manage `SystemSetting` key `fund_pool_balance`. Users submit `Remittance` records, admins verify to credit pool. See [app/api/remittances/route.ts](app/api/remittances/route.ts).

Data & Realtime
---------------
- **Prisma**: Always use singleton: `import { prisma } from '@/lib/prisma'`. Wrap multi-step ops in `prisma.$transaction(async (tx) => {...})`.
- **Socket.io**: Server bootstrap at [lib/realtime.ts](lib/realtime.ts). Initialized via [pages/api/socket.ts](pages/api/socket.ts) on first request.
  - Room conventions: `user-<id>` for per-user, `admin-room` for admins.
  - Client connection: uses `process.env.NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3000`) with path `/api/socket`.
  - Server emit pattern: `import { getIO } from '@/lib/realtime'` then `getIO().to('user-123').emit('budget-updated', payload)`.
  - **Critical**: Update both server ([lib/realtime.ts](lib/realtime.ts)) and client ([components/providers/SocketProvider.tsx](components/providers/SocketProvider.tsx)) when adding events.

Type System & Nullability
--------------------------
- **Nullable fields**: `user.name`, `user.role`, `status`, `priority` can be `string | null`. Always coalesce: `{name || 'Unknown'}`, `getStatusColor(status || 'PENDING')`.
- **Date handling**: Fields can be `Date | string`. Use `formatTime(dateInput: Date | string)` helper.
- **Session user**: Access via `session?.user?.id`, `session?.user?.role` (both can be null in edge cases).
- **TypeScript**: Project uses strict mode. Cast only when necessary (e.g., `as any` for Prisma adapter incompatibilities).

Developer Workflows
-------------------
- **Dev server**: `npm run dev` (watch for RSC/JSX parse errors in logs).
- **Database**: `npm run db:push` (sync schema) → `npm run db:generate` (update client) → `npm run db:seed` (populate data).
- **Build**: `npm run build` (full production build with type checking). Always run before deployment.
- **Tests**: `npm run test` (Vitest).
- **Lint**: `npm run lint`.

Codebase Conventions & Gotchas
------------------------------
- **"use client" directive**: Must be first line (no leading whitespace) in client components. Missing = JSX parse errors.
- **Path aliases**: All imports use `@/` (configured in [tsconfig.json](tsconfig.json)). Example: `import { Button } from '@/components/ui/button'`.
- **Select component**: Empty string `""` is special (clear value). Use `value || 'DEFAULT'` in Select.Item.
- **Null coalescing pattern**: Widely used—e.g., `getStatusColor(budget.status || 'PENDING')`, `{user.name || 'User'}`, `(user.role || 'USER')`.
- **Metadata JSON field**: Use spread with cast: `...transaction.metadata as any || {}` (Prisma Json type isn't plain object).
- **Exclude worktrees**: [tsconfig.json](tsconfig.json) excludes `fcp` and `fcp.worktrees` folders to prevent build pollution.

Key Files to Inspect
--------------------
- [app/layout.tsx](app/layout.tsx) — Root layout, PWA setup, font fallbacks.
- [components/providers/Providers.tsx](components/providers/Providers.tsx) — Next-auth, QueryClient, Socket setup.
- [components/providers/SocketProvider.tsx](components/providers/SocketProvider.tsx) — Client-side socket connection.
- [lib/prisma.ts](lib/prisma.ts) — Prisma singleton.
- [lib/realtime.ts](lib/realtime.ts) — Socket.io server logic.
- [lib/auth.ts](lib/auth.ts) — NextAuth configuration.
- [prisma/schema.prisma](prisma/schema.prisma) — Database schema (Budget, BudgetItem, Expenditure, Project, Transaction, etc.).
- [components/forms/CreateBudgetForm.tsx](components/forms/CreateBudgetForm.tsx) — Budget item-driven pattern example.
- [app/api/expenditures/route.ts](app/api/expenditures/route.ts) — Multi-step transaction example (budget validation, expenditure creation, supplementary budget logic).

Quick Examples
--------------
- **Prisma in server code**:
  ```typescript
  import { prisma } from '@/lib/prisma'
  const user = await prisma.user.findUnique({ where: { id: userId } })
  ```

- **Socket emit from server**:
  ```typescript
  import { getIO } from '@/lib/realtime'
  getIO().to(`user-${userId}`).emit('budget-updated', { budgetId, newAmount })
  ```

- **Multi-step DB transaction**:
  ```typescript
  await prisma.$transaction(async (tx) => {
    const budget = await tx.budget.findUnique({ where: { id: budgetId } })
    if (!budget) throw new Error('Not found')
    const expenditure = await tx.expenditure.create({ data: {...} })
    if (spentAmount > budget.amount) {
      await tx.supplementaryBudget.create({ data: {...} })
    }
  })
  ```

- **Null coalescing in JSX**:
  ```typescript
  <span className={getStatusColor(budget.status || 'PENDING')}>
    {budget.status || 'PENDING'}
  </span>
  ```

When Making Changes
-------------------
1. **UI changes**: Modify [components/](components/) files. Add `"use client"` if using hooks/browser APIs.
2. **API/DB changes**: Update [prisma/schema.prisma](prisma/schema.prisma) → `npm run db:generate` → `npm run db:push` → test with `npm run dev`.
3. **Socket events**: Update both [lib/realtime.ts](lib/realtime.ts) (server) and [components/providers/SocketProvider.tsx](components/providers/SocketProvider.tsx) (client) simultaneously.
4. **Build validation**: Always run `npm run build` before committing to catch type errors early.
5. **Env variables**: Add to `.env.local` and deployment settings. Critical ones: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SOCKET_URL`.

Testing & Debugging
-------------------
- **Dev server hangs**: Check if socket.io initialization is blocking. Verify `DATABASE_URL` is valid and database is accessible.
- **Type errors on build**: Use null coalescing (`field || 'default'`) for nullable fields. Check [types/next-auth.d.ts](types/next-auth.d.ts) for session shape.
- **Socket events not firing**: Ensure room names match between server emitter and client listener. Check browser console and terminal for connection errors.
- **Prisma type mismatches**: Cast with `as any` only when Prisma types conflict with Next-auth adapters (e.g., `PrismaAdapter(prisma) as any`).

If something needs expansion
---------------------------
Tell me which area to expand: API route patterns, Prisma model notes, CI/deploy steps, full event-list mapping, or a checklist for adding new payments/providers.
