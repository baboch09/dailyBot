// Vercel Serverless Function - точка входа для backend API
// Этот файл оборачивает Express приложение для работы на Vercel

import app from '../backend/src/index'

// Экспортируем для Vercel Serverless Functions
export default app
