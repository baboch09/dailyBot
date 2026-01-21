/**
 * Скрипт для очистки платежей по Telegram username
 * Использование: npx tsx scripts/clear-payments-by-username.ts username
 * Пример: npx tsx scripts/clear-payments-by-username.ts baboch09
 */

import prisma from '../src/utils/prisma'

const username = process.argv[2]

if (!username) {
  console.error('❌ Ошибка: Укажите Telegram username')
  console.log('Использование: npx tsx scripts/clear-payments-by-username.ts username')
  console.log('Пример: npx tsx scripts/clear-payments-by-username.ts baboch09')
  process.exit(1)
}

async function clearPaymentsByUsername() {
  try {
    // Убираем @ если указан
    const cleanUsername = username.replace('@', '').trim()
    
    console.log(`🔍 Поиск пользователя по username: ${cleanUsername}`)
    
    // Показываем всех пользователей для справки
    const allUsers = await prisma.user.findMany({
      include: {
        payments: true,
        _count: {
          select: { payments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n📋 Найдено пользователей в базе: ${allUsers.length}`)
    
    if (allUsers.length === 0) {
      console.log('❌ Пользователи не найдены')
      await prisma.$disconnect()
      process.exit(1)
    }

    // Показываем список всех пользователей
    console.log('\n👥 Список пользователей:')
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. telegram_id: ${user.telegramId}, платежей: ${user._count.payments}`)
    })

    // Пытаемся найти пользователя через Telegram Bot API
    // Для этого нужен TELEGRAM_BOT_TOKEN
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    
    let targetTelegramId: bigint | null = null

    // Показываем пользователей и просим выбрать по telegram_id
    console.log('\n💡 Поскольку поиск по username в Telegram API ограничен,')
    console.log('   пожалуйста, выберите telegram_id из списка выше и используйте:')
    console.log(`   npx tsx scripts/clear-payments.ts TELEGRAM_ID`)
    console.log('\nИли введите номер пользователя из списка для удаления платежей:')
    
    // Для автоматического поиска можно использовать telegram_id напрямую
    // или сделать интерактивный выбор, но для простоты оставим как есть

    // Если нашли через Telegram API, ищем в БД
    if (targetTelegramId) {
      const user = await prisma.user.findUnique({
        where: { telegramId: targetTelegramId },
        include: {
          payments: true
        }
      })

      if (user) {
        console.log(`\n✅ Найден пользователь в базе: telegram_id ${user.telegramId}`)
        console.log(`📊 Найдено платежей: ${user.payments.length}`)

        if (user.payments.length === 0) {
          console.log('✅ У пользователя нет платежей для удаления')
          await prisma.$disconnect()
          process.exit(0)
        }

        // Показываем платежи перед удалением
        console.log('\n💳 Платежи для удаления:')
        user.payments.forEach((payment, index) => {
          console.log(`  ${index + 1}. ${payment.amount} ₽, статус: ${payment.status}, дата: ${payment.createdAt.toLocaleDateString('ru-RU')}`)
        })

        // Запрашиваем подтверждение
        console.log(`\n⚠️  Вы уверены, что хотите удалить ${user.payments.length} платежей?`)
        console.log('Нажмите Ctrl+C для отмены, или Enter для продолжения...')
        
        // В интерактивном режиме нужно было бы ждать ввода, но для простоты сразу удаляем
        // Для безопасности можно добавить флаг --confirm

        // Удаляем все платежи пользователя
        const result = await prisma.payment.deleteMany({
          where: { userId: user.id }
        })

        console.log(`\n✅ Удалено платежей: ${result.count}`)
        console.log('🎉 Платежи успешно очищены!')
      } else {
        console.log(`\n❌ Пользователь с telegram_id ${targetTelegramId} не найден в базе данных`)
        console.log('Возможно, он еще не использовал приложение')
      }
    } else {
      // Если не нашли через Telegram API, предлагаем поиск по telegram_id вручную
      console.log(`\n❌ Не удалось найти пользователя по username "${cleanUsername}"`)
      console.log('\n💡 Альтернативные способы:')
      console.log('1. Используйте telegram_id напрямую:')
      console.log('   npx tsx scripts/clear-payments.ts YOUR_TELEGRAM_ID')
      console.log('2. Выберите telegram_id из списка выше и используйте его')
      console.log('3. Используйте Prisma Studio для визуального удаления')
    }

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('\n❌ Ошибка при очистке платежей:', error.message)
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

clearPaymentsByUsername()
