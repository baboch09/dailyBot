// Расширение типов Express для добавления user в Request
import { User } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
