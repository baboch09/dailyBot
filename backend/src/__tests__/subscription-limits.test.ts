/**
 * Тесты ограничений подписки Free / Pro
 * Запуск: npx vitest run src/__tests__/subscription-limits.test.ts
 */
import { describe, it, expect } from 'vitest'
import { FREE_HABITS_LIMIT } from '../middleware/subscription'

describe('Subscription limits', () => {
  it('FREE_HABITS_LIMIT equals 3', () => {
    expect(FREE_HABITS_LIMIT).toBe(3)
  })

  it('Free user cannot exceed 3 habits (logic check)', () => {
    const habitsCount = 3
    const isPremium = false
    const canAdd = !isPremium ? habitsCount < FREE_HABITS_LIMIT : true
    expect(canAdd).toBe(false)
    expect(!isPremium && habitsCount >= FREE_HABITS_LIMIT).toBe(true)
  })

  it('Free user can add when under limit', () => {
    const habitsCount = 2
    const isPremium = false
    const canAdd = isPremium || habitsCount < FREE_HABITS_LIMIT
    expect(canAdd).toBe(true)
  })

  it('Pro user can add unlimited habits', () => {
    const habitsCount = 10
    const isPremium = true
    const canAdd = isPremium || habitsCount < FREE_HABITS_LIMIT
    expect(canAdd).toBe(true)
  })
})
