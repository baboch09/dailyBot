# 📤 Инструкция по push в GitHub

## Текущий статус

✅ Git репозиторий инициализирован
✅ Remote настроен: `https://github.com/baboch09/dailyBot.git`
✅ Файлы добавлены и закоммичены

## Осталось только запушить!

### Вариант 1: Через GitHub CLI (самый простой)

```bash
# Установите GitHub CLI (если ещё нет)
brew install gh

# Войдите
gh auth login

# Запушьте
cd /Users/ebabochiev/Desktop/tg
git push -u origin main
```

### Вариант 2: Использовать Personal Access Token

1. **Создайте токен на GitHub:**
   - Зайдите на github.com
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token
   - Выберите scope: `repo`
   - Скопируйте токен

2. **Запушьте:**
   ```bash
   cd /Users/ebabochiev/Desktop/tg
   git push -u origin main
   ```
   
   Когда попросит:
   - **Username:** ваш GitHub username
   - **Password:** вставьте токен (НЕ пароль!)

### Вариант 3: Использовать SSH (если настроен)

```bash
cd /Users/ebabochiev/Desktop/tg
git remote set-url origin git@github.com:baboch09/dailyBot.git
git push -u origin main
```

Если SSH ключ не настроен, создайте его:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Добавьте ключ в GitHub: Settings → SSH and GPG keys
```

## После успешного push

Код будет в репозитории, и вы сможете:

1. **Деплоить через Vercel веб-интерфейс:**
   - vercel.com → Add New Project
   - Import Git Repository
   - Выберите `baboch09/dailyBot`
   - Vercel автоматически определит настройки!

2. **Обновлять код:**
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

---

## Быстрая команда (после настройки аутентификации):

```bash
cd /Users/ebabochiev/Desktop/tg
git push -u origin main
```

Готово! 🎉
