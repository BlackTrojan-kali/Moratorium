import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowRight,
  Building2,
  CircleHelp,
  LockKeyhole,
  Pencil,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../../app/AuthContext';
import { usePreferences } from '../../app/PreferencesContext';
import { roleLabelKeys, roleLabels, rolePhotoByRole } from '../../config/roles';
import { useTranslation } from '../../i18n/I18nContext';
import type { MessageKey } from '../../i18n/messages';
import type { UserRole } from '../../types/domain';

type EditableField =
  | 'displayName'
  | 'email'
  | 'phone'
  | 'organisation'
  | 'officialIdentifier';

/**
 * Values the account owner may maintain. A field only appears in the form when
 * the API lists it as editable, so staff never see employer-only fields.
 */
const editableFields: {
  key: EditableField;
  labelKey: MessageKey;
  type: string;
  hintKey?: MessageKey;
  required?: boolean;
}[] = [
  { key: 'displayName', labelKey: 'profile.name', type: 'text', required: true },
  { key: 'email', labelKey: 'profile.email', type: 'email', required: true },
  { key: 'phone', labelKey: 'profile.phone', type: 'tel' },
  {
    key: 'organisation',
    labelKey: 'profile.organisationName',
    type: 'text',
    required: true,
  },
  {
    key: 'officialIdentifier',
    labelKey: 'profile.cnpsNumber',
    type: 'text',
    hintKey: 'profile.cnpsHint',
  },
];

/** Each role works on different things, so the profile points at its own tasks. */
const roleFocus: Record<
  UserRole,
  { noteKey: MessageKey; links: { labelKey: MessageKey; to: string }[] }
> = {
  employer: {
    noteKey: 'focus.employer.note',
    links: [
      { labelKey: 'focus.employer.link1', to: '/requests' },
      { labelKey: 'focus.employer.link2', to: '/requests/new' },
    ],
  },
  agent_dt: {
    noteKey: 'focus.agent_dt.note',
    links: [
      { labelKey: 'focus.agent_dt.link1', to: '/work-queue' },
      { labelKey: 'focus.agent_dt.link2', to: '/assignments' },
    ],
  },
  ce_cea: {
    noteKey: 'focus.ce_cea.note',
    links: [
      { labelKey: 'focus.ce_cea.link1', to: '/decisions' },
      { labelKey: 'focus.ce_cea.link2', to: '/decision-history' },
    ],
  },
  s_dct: {
    noteKey: 'focus.s_dct.note',
    links: [
      { labelKey: 'focus.s_dct.link1', to: '/decisions' },
      { labelKey: 'focus.s_dct.link2', to: '/decision-history' },
    ],
  },
  dt: {
    noteKey: 'focus.dt.note',
    links: [
      { labelKey: 'focus.dt.link1', to: '/decisions' },
      { labelKey: 'focus.dt.link2', to: '/decision-history' },
    ],
  },
  dg: {
    noteKey: 'focus.dg.note',
    links: [
      { labelKey: 'focus.dg.link1', to: '/decisions' },
      { labelKey: 'focus.dg.link2', to: '/decision-history' },
    ],
  },
  cps: {
    noteKey: 'focus.cps.note',
    links: [
      { labelKey: 'focus.cps.link1', to: '/reconciliation' },
      { labelKey: 'focus.cps.link2', to: '/overdue' },
    ],
  },
  administrator: {
    noteKey: 'focus.administrator.note',
    links: [
      { labelKey: 'focus.administrator.link1', to: '/admin/users' },
      { labelKey: 'focus.administrator.link2', to: '/admin/settings' },
    ],
  },
};

/**
 * Profile owns the account identity: who you are, the organisation you act
 * for and the role that decides what you can do. Behavioural preferences and
 * security live in Settings.
 */
export function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return <ProfileContent key={`${user.id}:${user.role}`} />;
}

function ProfileContent() {
  const { user } = useAuth();
  const { data, loading, saving, error, reload, save } = usePreferences();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<EditableField, string>>({
    displayName: '',
    email: '',
    phone: '',
    organisation: '',
    officialIdentifier: '',
  });
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  if (!user) return null;

  const account = data?.account;
  const editable = account?.editable ?? [];
  const employer = user.role === 'employer';
  const focus = roleFocus[user.role];
  const displayName = account?.displayName || user.displayName;

  function startEditing() {
    setDraft({
      displayName: account?.displayName ?? '',
      email: account?.email ?? '',
      phone: account?.phone ?? '',
      organisation: account?.organisation ?? '',
      officialIdentifier: account?.officialIdentifier ?? '',
    });
    setFormError('');
    setNotice('');
    setEditing(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!data) return;

    setFormError('');

    const values: Partial<Record<EditableField, string>> = {};

    for (const field of editableFields) {
      if (editable.includes(field.key)) {
        values[field.key] = draft[field.key].trim();
      }
    }

    try {
      await save({ section: 'account', values });

      // The header greeting and avatar read the authenticated identity.
      window.dispatchEvent(new Event('profile-updated'));

      setEditing(false);
      setNotice(t('profile.saved'));
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : t('profile.saveFailed'),
      );
    }
  }

  // Employers maintain their own organisation details. For staff those values
  // come from the centre they are attached to and cannot be changed here.
  const official = employer
    ? [{ label: t('profile.role'), value: t(roleLabelKeys[user.role]) }]
    : [
        { label: t('profile.role'), value: t(roleLabelKeys[user.role]) },
        {
          label: t('profile.organisationStaff'),
          value: account?.organisation,
        },
      ];

  return (
    <div className="page">
      <header className="page-heading">
        <p className="page-heading-eyebrow">{t('profile.eyebrow')}</p>
        <h1>
          {employer ? t('profile.employerTitle') : t('profile.title')}
        </h1>
        <p>{t('profile.lead')}</p>
      </header>

      {notice && (
        <p className="page-note" role="status" style={{ marginBottom: 22 }}>
          {notice}
        </p>
      )}

      <div className="page-columns">
        <section className="page-card" aria-labelledby="account-information">
          <div className="page-card-heading">
            <div>
              <h2 id="account-information">{t('profile.cardTitle')}</h2>
              <p>{t('profile.cardLead')}</p>
            </div>

            {data && !editing && (
              <button
                type="button"
                className="page-button"
                onClick={startEditing}
              >
                <Pencil size={15} aria-hidden="true" />
                <span style={{ marginLeft: 6 }}>{t('profile.edit')}</span>
              </button>
            )}
          </div>

          {loading && !data && (
            <p className="page-state" role="status">
              {t('profile.loading')}
            </p>
          )}

          {!loading && error && !data && (
            <div className="page-empty">
              <p className="page-alert" role="alert">
                {error}
              </p>

              <button type="button" className="page-button" onClick={reload}>
                {t('profile.retry')}
              </button>
            </div>
          )}

          {data && editing && (
            <form className="page-form" onSubmit={submit} noValidate>
              {editableFields
                .filter(field => editable.includes(field.key))
                .map(field => (
                  <label className="page-form-field" key={field.key}>
                    {t(field.labelKey)}

                    <input
                      type={field.type}
                      value={draft[field.key]}
                      required={Boolean(field.required)}
                      maxLength={
                        field.key === 'displayName'
                          ? 120
                          : field.key === 'organisation'
                            ? 200
                            : field.key === 'officialIdentifier'
                              ? 80
                              : 254
                      }
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />

                    {field.hintKey && (
                      <span className="page-form-hint">
                        {t(field.hintKey)}
                      </span>
                    )}
                  </label>
                ))}

              {editable.length === 0 && (
                <p className="page-state">{t('profile.allManaged')}</p>
              )}

              {formError && (
                <p className="page-alert" role="alert">
                  {formError}
                </p>
              )}

              <div className="page-actions">
                <button
                  className="page-button page-button-primary"
                  disabled={saving}
                >
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>

                <button
                  type="button"
                  className="page-button"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setFormError('');
                  }}
                >
                  {t('profile.cancel')}
                </button>
              </div>

              <dl className="page-fields">
                <p className="profile-locked-title">
                  {t('profile.lockedTitle')}
                </p>

                {official.map(item => (
                  <div className="page-field" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>
                      <span>{item.value || t('profile.unavailable')}</span>
                      <span
                        className="page-field-lock"
                        title={t('profile.lockedHint')}
                      >
                        <LockKeyhole size={16} aria-hidden="true" />
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </form>
          )}

          {data && !editing && (
            <>
              <dl className="page-fields">
                <div className="page-field">
                  <dt>{t('profile.name')}</dt>
                  <dd>{displayName}</dd>
                </div>

                <div className="page-field">
                  <dt>{t('profile.email')}</dt>
                  <dd>{account?.email || t('profile.unavailable')}</dd>
                </div>

                <div className="page-field">
                  <dt>{t('profile.phone')}</dt>
                  <dd>{account?.phone || t('profile.phoneMissing')}</dd>
                </div>

                {employer && (
                  <>
                    <div className="page-field">
                      <dt>{t('profile.organisationName')}</dt>
                      <dd>{account?.organisation || t('profile.unavailable')}</dd>
                    </div>

                    <div className="page-field">
                      <dt>{t('profile.cnpsNumber')}</dt>
                      <dd>
                        {account?.officialIdentifier || t('profile.cnpsMissing')}
                      </dd>
                    </div>
                  </>
                )}

                {official.map(item => (
                  <div className="page-field" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>
                      <span>{item.value || t('profile.unavailable')}</span>
                      <span
                        className="page-field-lock"
                        title={t('profile.lockedHint')}
                      >
                        <LockKeyhole size={16} aria-hidden="true" />
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              {error && (
                <p className="page-alert" role="alert" style={{ marginTop: 18 }}>
                  {error}
                </p>
              )}
            </>
          )}
        </section>

        <aside className="page-card profile-summary">
          <div className="profile-avatar">
            {imageFailed ? (
              <UserRound size={46} aria-hidden="true" />
            ) : (
              <img
                src={rolePhotoByRole[user.role]}
                alt=""
                onError={() => setImageFailed(true)}
              />
            )}
          </div>

          <h2>{displayName}</h2>

          <span className="page-badge">{t(roleLabelKeys[user.role])}</span>

          <div className="profile-summary-note">
            <Building2 size={21} aria-hidden="true" />
            <p>{t(focus.noteKey)}</p>
          </div>

          <nav className="profile-links" aria-label={t('profile.mainTasks')}>
            {focus.links.map(link => (
              <Link key={link.to} to={link.to}>
                <ArrowRight size={16} aria-hidden="true" />
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <nav className="profile-links" aria-label={t('profile.accountPages')}>
            <Link to="/settings?tab=security">
              <LockKeyhole size={16} aria-hidden="true" />
              {t('profile.security')}
            </Link>

            <Link to="/settings">
              <Pencil size={16} aria-hidden="true" />
              {t('profile.preferences')}
            </Link>

            <Link to="/help">
              <CircleHelp size={16} aria-hidden="true" />
              {t('profile.help')}
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}