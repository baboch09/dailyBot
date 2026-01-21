/**
 * Скрипт для очистки платежей пользователя
 * Использование: npx tsx scripts/clear-payments.ts YOUR_TELEGRAM_ID
 */

import prisma from '../src/utils/prisma'

const telegramId = process.argv[2]

if (!telegramId) {
  console.error('❌ Ошибка: Укажите telegram_id')
  console.log('Использование: npx tsx scripts/clear-payments.ts YOUR_TELEGRAM_ID')
  console.log('')
  console.log('Чтобы узнать свой telegram_id:')
  console.log('1. Откройте приложение через Telegram бота')
  console.log('2. Откройте DevTools (F12) в браузере')
  console.log('3. В консоли выполните: window.Telegram.WebApp.initDataUnsafe.user.id')
  process.exit(1)
}

async function clearPayments() {
  try {
    console.log(`🔍 Поиск пользователя с telegram_id: ${telegramId}`)
    
    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        payments: true
      }
    })

    if (!user) {
      console.error(`❌ Пользователь с telegram_id ${telegramId} не найден`)
      process.exit(1)
    }

    console.log(`✅ Найден пользователь: ${user.id}`)
    console.log(`📊 Найдено платежей: ${user.payments.length}`)

    if (user.payments.length === 0) {
      console.log('✅ У вас нет платежей для удаления')
      await prisma.$disconnect()
      process.exit(0)
    }

    // Удаляем все платежи пользователя
    const result = await prisma.payment.deleteMany({
      where: { userId: user.id }
    })

    console.log(`✅ Удалено платежей: ${result.count}`)
    console.log('🎉 Платежи успешно очищены!')

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Ошибка при очистке платежей:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

clearPayments()
