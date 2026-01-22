# Инструкция по удалению тестового режима (5 минут = день)

## ⚠️ ВАЖНО: Этот файл нужно удалить после завершения тестирования!

Тестовый режим позволяет тестировать логику streak, используя 5-минутные интервалы вместо реальных дней.

## Файлы с тестовым кодом:

### 1. `backend/src/utils/streak.ts`
- Функции `getCurrentPeriod()`, `getNextPeriod()`, `getPreviousPeriod()` - **УДАЛИТЬ**
- В `calculateStreak()` - заменить `getCurrentPeriod()` на:
  ```typescript
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  ```
- В `isCompletedToday()` - заменить `getCurrentPeriod()` и `getNextPeriod()` на:
  ```typescript
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  ```
- Убрать все `TEST_MODE` проверки и нормализацию по 5-минутным интервалам
- Вернуть нормализацию к `setUTCHours(0, 0, 0, 0)`

### 2. `backend/src/controllers/habits.controller.ts`
- Убрать импорт `getCurrentPeriod`, `getNextPeriod`, `getPreviousPeriod`
- В `getHabits()` - заменить:
  ```typescript
  const today = getCurrentPeriod()
  const tomorrow = getNextPeriod(today)
  ```
  на:
  ```typescript
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  ```
- В `calculateStreakFromLogs()` - убрать все `TEST_MODE` проверки
- В `completeHabitToday()` - заменить:
  ```typescript
  const today = getCurrentPeriod()
  const tomorrow = getNextPeriod(today)
  ```
  на:
  ```typescript
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  ```

## Поиск всех мест с тестовым кодом:

```bash
# Найти все упоминания TEST_MODE
grep -r "TEST_MODE" backend/src/

# Найти все упоминания getCurrentPeriod
grep -r "getCurrentPeriod" backend/src/

# Найти все TODO комментарии о тестировании
grep -r "TODO.*ТЕСТ" backend/src/
grep -r "TODO.*тест" backend/src/
```

## После удаления:

1. Удалить этот файл (`TEST_MODE_REMOVE.md`)
2. Протестировать, что streak работает с реальными днями
3. Убедиться, что все тесты проходят
