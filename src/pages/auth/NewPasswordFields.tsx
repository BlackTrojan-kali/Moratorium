import { useTranslation } from '../../i18n/I18nContext';
import { PasswordField } from './AuthLayout';

export interface PasswordCheck {
  label: string;
  met: boolean;
}

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

/** The three rules the API enforces, shown live while the user types. */
export function passwordChecks(
  password: string,
  confirmation: string,
  label: (key: 'account.ruleLength' | 'account.ruleMaximum' | 'account.ruleMatch') => string,
): PasswordCheck[] {
  return [
    { label: label('account.ruleLength'), met: password.length >= MIN_LENGTH },
    {
      label: label('account.ruleMaximum'),
      met: password.length > 0 && password.length <= MAX_LENGTH,
    },
    {
      label: label('account.ruleMatch'),
      met: password.length > 0 && password === confirmation,
    },
  ];
}

interface NewPasswordFieldsProps {
  idPrefix: string;
  password: string;
  confirmation: string;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
}

export function NewPasswordFields({
  idPrefix,
  password,
  confirmation,
  onPassword,
  onConfirmation,
}: NewPasswordFieldsProps) {
  const { t } = useTranslation();
  const checks = passwordChecks(password, confirmation, t);

  return (
    <>
      <PasswordField
        id={`${idPrefix}-password`}
        label={t('account.newPassword')}
        value={password}
        autoComplete="new-password"
        onChange={onPassword}
        minLength={MIN_LENGTH}
        maxLength={MAX_LENGTH}
      />

      <PasswordField
        id={`${idPrefix}-confirmation`}
        label={t('account.confirmPassword')}
        value={confirmation}
        autoComplete="new-password"
        onChange={onConfirmation}
        maxLength={MAX_LENGTH}
      />

      <ul className="auth-requirements">
        {checks.map(check => (
          <li key={check.label} data-met={check.met}>
            {check.label}
          </li>
        ))}
      </ul>
    </>
  );
}
