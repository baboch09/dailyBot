// Отдельный endpoint для health check на Vercel
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  })
}
