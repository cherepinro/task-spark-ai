# Internationalization (i18n) Implementation

## Overview
TaskSpark AI now supports full internationalization with **Russian as the primary language** and English as a fallback. Users can switch between languages via the Settings page.

## Implementation Details

### Libraries Used
- **react-i18next**: React bindings for i18next
- **i18next**: Core internationalization framework
- **i18next-browser-languagedetector**: Automatic language detection from browser/localStorage

### File Structure
```
client/src/i18n/
├── config.ts              # i18next configuration with Russian default
├── locales/
│   ├── ru.json           # Russian translations (primary)
│   └── en.json           # English translations (fallback)
```

### Configuration
- **Default Language**: Russian (ru)
- **Fallback Language**: English (en)
- **Detection Order**: localStorage → browser → default (ru)
- **localStorage Key**: `i18nextLng`

### Translation Coverage
The following areas have been translated:

#### Navigation & Layout
- Sidebar navigation items (Dashboard, Tasks, Projects, Day Planner, Settings, Admin)
- Authentication buttons (Login, Logout)
- Theme and accessibility labels

#### Pages
- **Dashboard**: All UI elements including productivity insights
- **Tasks**: Task management interface
- **Projects**: Project management interface  
- **Day Planner**: Daily planning interface
- **Settings**: All settings sections and labels
- **Admin**: User management dashboard
- **Landing**: Public landing page

#### Features
- AI features (Chat, Insights, Decomposition, Day Planning)
- Focus Sprint session interface
- Task templates
- Bulk import functionality
- Push notifications settings

### Components

#### LanguageSwitcher Component
Location: `client/src/components/language-switcher.tsx`

A dropdown selector in the Settings page that allows users to:
- View current language
- Switch between Russian and English
- Persist language preference to localStorage

```typescript
import { LanguageSwitcher } from '@/components/language-switcher';

// Usage in Settings page
<LanguageSwitcher />
```

### Updated Components
The following components have been updated to use translations:

1. **AppSidebar** (`client/src/components/app-sidebar.tsx`)
   - Navigation links
   - Admin link
   - Logout button
   - AI status indicator

2. **Settings** (`client/src/pages/settings.tsx`)
   - Page title
   - Section headers
   - Language switcher
   - Notification settings
   - Focus Sprint settings

### Key Translation Keys

#### Navigation
```json
{
  "nav": {
    "dashboard": "Панель управления",
    "tasks": "Задачи",
    "projects": "Проекты",
    "dayPlanner": "Планировщик дня",
    "settings": "Настройки",
    "admin": "Администрирование"
  }
}
```

#### Authentication
```json
{
  "auth": {
    "login": "Войти",
    "logOut": "Выйти",
    "welcome": "Добро пожаловать в TaskSpark AI"
  }
}
```

#### Settings
```json
{
  "settings": {
    "title": "Настройки",
    "language": "Язык",
    "notifications": "Уведомления",
    "pushNotifications": "Push-уведомления",
    "enableSprint": "Включить фокус-спринт"
  }
}
```

#### Focus Sprint
```json
{
  "focusSprint": {
    "title": "Фокус-спринт",
    "start": "Начать 10-мин спринт",
    "stop": "Остановить спринт"
  }
}
```

## Usage in Components

### Basic Translation
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('nav.dashboard')}</h1>
  );
}
```

### With Variables
```typescript
const { t } = useTranslation();
<p>{t('tasks.count', { count: taskCount })}</p>
```

### Language Switching
```typescript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();

// Change language
i18n.changeLanguage('en');

// Get current language
console.log(i18n.language); // 'ru' or 'en'
```

## Testing
Since the app uses Replit Auth, automated e2e testing requires manual authentication. To test the i18n implementation:

1. Log in to the application
2. Navigate to Settings page
3. Verify Russian text is displayed by default
4. Use the language switcher to change to English
5. Verify all text updates to English
6. Switch back to Russian
7. Refresh the page and verify language persists

## Future Enhancements
- Add more language options (Spanish, German, French, etc.)
- Translate remaining static text (descriptions, placeholders)
- Add date/time localization
- Add number formatting localization
- Translate error messages and validation text

## Documentation Updated
- `replit.md` - Added comprehensive i18n section
- Listed i18next as external dependency
- Updated user preferences to reflect Russian as primary language
