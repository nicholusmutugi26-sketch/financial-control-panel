import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin@financialpanel123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@financialpanel.com' },
    update: {},
    create: {
      email: 'admin@financialpanel.com',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN',
      phoneNumber: '254792919470',
    },
  })

 

  console.log('Created users:')
  console.log('- Admin:', admin.email)
  

  // Create Sample Budget
  const budget = await prisma.budget.create({
    data: {
      title: 'Monthly Household Budget',
      description: 'Budget for household expenses for January 2024',
      amount: 100000,
      priority: 'NORMAL',
      disbursementType: 'FULL',
      createdBy: user.id,
      status: 'APPROVED',
      allocatedAmount: 50000,
    },
  })

  // Create Sample Expenditure
  const expenditure = await prisma.expenditure.create({
    data: {
      title: 'Grocery Shopping',
      description: 'Weekly grocery shopping',
      amount: 15000,
      priority: 'NORMAL',
      createdBy: user.id,
      budgetId: budget.id,
      status: 'APPROVED',
    },
  })

  // Create Expenditure Items
  await prisma.expenditureItem.createMany({
    data: [
      {
        expenditureId: expenditure.id,
        name: 'Vegetables',
        description: 'Fresh vegetables',
        amount: 5000,
      },
      {
        expenditureId: expenditure.id,
        name: 'Meat',
        description: 'Chicken and beef',
        amount: 7000,
      },
      {
        expenditureId: expenditure.id,
        name: 'Dairy',
        description: 'Milk, eggs, cheese',
        amount: 3000,
      },
    ],
  })

  // Create Sample Project
  const project = await prisma.project.create({
    data: {
      title: 'Home Renovation',
      description: 'Renovate kitchen and living room',
      createdBy: user.id,
      status: 'PROPOSED',
    },
  })

  console.log('Created sample data:')
  console.log('- Budget:', budget.title)
  console.log('- Expenditure:', expenditure.title)
  console.log('- Project:', project.title)
  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
