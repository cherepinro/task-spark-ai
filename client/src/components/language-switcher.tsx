import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'ru', name: 'Русский', nativeName: 'Русский' },
  { code: 'en', name: 'English', nativeName: 'English' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Languages className="h-4 w-4" />
        {t('settings.language')}
      </Label>
      <Select value={i18n.language} onValueChange={changeLanguage}>
        <SelectTrigger data-testid="select-language">
          <SelectValue placeholder={t('settings.language')} />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} data-testid={`language-${lang.code}`}>
              {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
