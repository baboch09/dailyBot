// Vercel Serverless Function - точка входа для backend API
import type { VercelRequest, VercelResponse } from '@vercel/node'
import expressApp from '../backend/src/index'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Express app уже экспортирован как default из backend/src/index.ts
  // Vercel автоматически оборачивает Express app в serverless функцию
  return expressApp(req, res)
}

