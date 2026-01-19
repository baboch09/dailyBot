import { PrismaClient } from '@prisma/client'

// Singleton instance для Prisma Client
const prisma = new PrismaClient()

export default prisma
