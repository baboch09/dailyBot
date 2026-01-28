// Быстрая проверка статуса платежа в YooKassa
const paymentId = '310c5547-000f-5001-9000-184929a3bfac'

// ВСТАВЬТЕ ВАШИ КЛЮЧИ:
const shopId = process.env.YUKASSA_SHOP_ID || '1253644' // Из ответа выше
const secretKey = process.env.YUKASSA_SECRET_KEY || 'YOUR_SECRET_KEY'

const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('📊 Payment status:')
  console.log(`   ID: ${data.id}`)
  console.log(`   Status: ${data.status}`)
  console.log(`   Paid: ${data.paid}`)
  console.log(`   Amount: ${data.amount.value} ${data.amount.currency}`)
  console.log(`   Created: ${data.created_at}`)
  
  if (data.paid) {
    console.log('\n✅ PAYMENT IS PAID!')
    console.log('   Webhook должен был прийти и активировать подписку')
    console.log('   Проверьте логи Vercel на наличие webhook')
  } else {
    console.log('\n⏳ PAYMENT IS NOT PAID YET')
    console.log('   Пользователь еще не завершил оплату')
    console.log('   Или YooKassa обрабатывает (подождите 1-5 минут)')
  }
  
  console.log('\nFull response:')
  console.log(JSON.stringify(data, null, 2))
})
.catch(err => {
  console.error('❌ Error:', err.message)
})
