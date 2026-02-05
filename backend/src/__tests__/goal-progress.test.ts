/**
 * Тесты логики целей (превью прогресса)
 * Запуск: npx vitest run src/__tests__/goal-progress.test.ts
 */
import { describe, it, expect } from 'vitest'

function getGoalProgressLabel(
  goalType: string,
  goalTarget: number,
  currentStreak: number
): string {
  if (goalType !== 'streak' || goalTarget == null) return ''
  const done = Math.min(currentStreak, goalTarget)
  const target = goalTarget
  const dayWord =
    target === 1 ? 'день' : target < 5 ? 'дня' : 'дней'
  return `${target} ${dayWord} подряд — ${done}/${target} выполнено`
}

describe('Goal progress', () => {
  it('formats streak goal label correctly', () => {
    expect(getGoalProgressLabel('streak', 21, 7)).toBe(
      '21 дней подряд — 7/21 выполнено'
    )
  })

  it('caps progress at goal target', () => {
    expect(getGoalProgressLabel('streak', 21, 30)).toBe(
      '21 дней подряд — 21/21 выполнено'
    )
  })

  it('returns empty for non-streak type', () => {
    expect(getGoalProgressLabel('count', 10, 5)).toBe('')
  })

  it('handles singular day', () => {
    expect(getGoalProgressLabel('streak', 1, 1)).toBe(
      '1 день подряд — 1/1 выполнено'
    )
  })
})
