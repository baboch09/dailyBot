// Vercel Serverless Function - точка входа для backend API
import type { VercelRequest, VercelResponse } from '@vercel/node'
import expressApp from '../backend/src/index'

// Vercel автоматически оборачивает Express app
export default expressApp
