import { useTranslation } from './I18nContext';
import { languages } from './messages';

/**
 * Compact EN / FR switch. Used on the public screens so a visitor can choose a
 * language before signing in, and in Settings for the saved preference.
 */
export function LanguageSwitch({ label }: { label?: string }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      className="language-switch"
      role="group"
      aria-label={label ?? t('settings.language')}
    >
      {languages.map(item => (
        <button
          key={item.value}
          type="button"
          className={`language-switch-option ${
            language === item.value ? 'is-active' : ''
          }`}
          aria-pressed={language === item.value}
          title={item.label}
          lang={item.value}
          onClick={() => void setLanguage(item.value)}
        >
          {item.value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
