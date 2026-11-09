import { useEffect, useRef, useState } from 'react';

import {
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import { api } from '../../app/api';

import '../../styles/roles.css';

interface RoleOption {
  id: string;
  label: string;
  description: string | null;
}

interface Permission {
  action: string;
  enabled: boolean;
  editable: boolean;
}

interface PermissionArea {
  id: string;
  label: string;
  permissions: Permission[];
}

interface RolePermissions {
  roleId: string;
  version: string;
  csrfToken: string;
  canEdit: boolean;

  actions: {
    code: string;
    label: string;
  }[];

  areas: PermissionArea[];
}

interface PermissionChange {
  areaId: string;
  action: string;
  enabled: boolean;
}

function permissionKey(areaId: string, action: string) {
  return JSON.stringify([areaId, action]);
}

function valuesFrom(data: RolePermissions) {
  const values: Record<string, boolean> = {};

  for (const area of data.areas) {
    for (const permission of area.permissions) {
      values[permissionKey(area.id, permission.action)] =
        permission.enabled;
    }
  }

  return values;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to complete this action.';
}

export function Roles() {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const [rolesRevision, setRolesRevision] = useState(0);

  const [selectedId, setSelectedId] = useState('');
  const [record, setRecord] =
    useState<RolePermissions | null>(null);

  const [values, setValues] =
    useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);

  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mustReload, setMustReload] = useState(false);

  const lock = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    setRolesLoading(true);
    setRolesError('');

    api<{ roles: RoleOption[] }>('/admin/roles')
      .then(result => {
        if (active) setRoles(result.roles);
      })
      .catch(caught => {
        if (active) setRolesError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setRolesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rolesRevision]);

  useEffect(() => {
    if (!selectedId) return;

    let active = true;

    setLoading(true);
    setError('');
    setMessage('');

    api<RolePermissions>(
      `/admin/roles/${encodeURIComponent(selectedId)}/permissions`,
    )
      .then(result => {
        if (result.roleId !== selectedId) {
          throw new Error(
            'The service returned permissions for a different role.',
          );
        }

        if (!active) return;

        setRecord(result);
        setValues(valuesFrom(result));
        setMustReload(false);
        setReviewing(false);
      })
      .catch(caught => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, revision]);

  const changes: PermissionChange[] = [];

  if (record?.canEdit) {
    for (const area of record.areas) {
      for (const permission of area.permissions) {
        const value =
          values[permissionKey(area.id, permission.action)];

        if (
          permission.editable &&
          typeof value === 'boolean' &&
          value !== permission.enabled
        ) {
          changes.push({
            areaId: area.id,
            action: permission.action,
            enabled: value,
          });
        }
      }
    }
  }

  const dirty = changes.length > 0;

  const selectedRole = roles.find(
    role => role.id === selectedId,
  );

  useEffect(() => {
    if (error || message || reviewing) {
      feedback.current?.focus();
    }
  }, [error, message, reviewing]);

  useEffect(() => {
    function warnBeforeClose(event: BeforeUnloadEvent) {
      if (dirty || lock.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    }

    function warnBeforeLink(event: MouseEvent) {
      if (!dirty && !lock.current) return;

      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const link =
        event.target instanceof Element
          ? event.target.closest('a')
          : null;

      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download')
      ) return;

      if (
        lock.current ||
        !window.confirm('Discard your unsaved permission changes?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', warnBeforeClose);
    document.addEventListener('click', warnBeforeLink, true);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeClose);
      document.removeEventListener('click', warnBeforeLink, true);
    };
  }, [dirty]);

  function chooseRole(id: string) {
    if (lock.current) return;

    if (
      dirty &&
      !window.confirm('Discard changes and select another role?')
    ) return;

    setRecord(null);
    setValues({});
    setError('');
    setMessage('');
    setReviewing(false);
    setMustReload(false);
    setSelectedId(id);
  }

  function cancelChanges() {
    if (!record || lock.current) return;

    setValues(valuesFrom(record));
    setReviewing(false);
    setMessage('');

    if (!mustReload) setError('');
  }

  function reloadPermissions() {
    if (lock.current) return;

    if (
      dirty &&
      !window.confirm('Reload saved permissions and discard your changes?')
    ) return;

    setRecord(null);
    setValues({});
    setReviewing(false);
    setRevision(value => value + 1);
  }

  async function saveChanges() {
    if (
      !record ||
      !record.canEdit ||
      !reviewing ||
      !dirty ||
      mustReload ||
      lock.current
    ) return;

    lock.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await api<RolePermissions>(
        `/admin/roles/${encodeURIComponent(record.roleId)}/permissions`,
        {
          version: record.version,
          csrfToken: record.csrfToken,
          changes,
        },
      );

      if (result.roleId !== record.roleId) {
        throw new Error(
          'The saved result could not be verified. Reload permissions.',
        );
      }

      setRecord(result);
      setValues(valuesFrom(result));
      setReviewing(false);
      setMessage('Role permissions saved.');
    } catch (caught) {
      setError(errorMessage(caught));
      setMustReload(true);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="roles-page">
      <header className="roles-heading">
        <p>Administration</p>
        <h1>Roles &amp; access</h1>
        <span>
          Review the permissions assigned to each role.
        </span>
      </header>

      <div className="roles-layout">
        <aside className="roles-card roles-selector">
          <div className="roles-symbol">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>

          <h2>Select role</h2>

          {rolesLoading ? (
            <p role="status">Loading roles…</p>
          ) : rolesError ? (
            <div role="alert">
              <p>{rolesError}</p>

              <button
                type="button"
                onClick={() =>
                  setRolesRevision(value => value + 1)
                }
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <label
                className="roles-sr-only"
                htmlFor="role-selection"
              >
                Role
              </label>

              <select
                id="role-selection"
                value={selectedId}
                disabled={saving}
                onChange={event =>
                  chooseRole(event.target.value)
                }
              >
                <option value="">Select a role</option>

                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>

              {roles.length === 0 && (
                <p>No roles are available.</p>
              )}

              {selectedRole?.description && (
                <p>{selectedRole.description}</p>
              )}
            </>
          )}

          <div className="roles-selector-note">
            <LockKeyhole size={17} aria-hidden="true" />

            <p>
              Protected permissions are managed
              by the system.
            </p>
          </div>
        </aside>

        <section
          className="roles-card roles-permissions"
          aria-labelledby="permissions-title"
          aria-busy={loading || saving}
        >
          <header className="roles-card-heading">
            <h2 id="permissions-title">Permissions</h2>

            {selectedRole && (
              <span className="roles-badge">
                {selectedRole.label}
              </span>
            )}
          </header>

          <div ref={feedback} tabIndex={-1}>
            {error && (
              <div className="roles-feedback roles-error" role="alert">
                <p>{error}</p>

                {mustReload && (
                  <p>
                    Reload saved permissions before making another change.
                  </p>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={reloadPermissions}
                >
                  Reload permissions
                </button>
              </div>
            )}

            {message && (
              <p className="roles-feedback" role="status">
                {message}
              </p>
            )}

            {reviewing && record && (
              <section className="roles-review">
                <h3>Review changes</h3>

                <p>
                  These changes affect access for users
                  assigned to {selectedRole?.label}.
                </p>

                <ul>
                  {changes.map(change => {
                    const area = record.areas.find(
                      item => item.id === change.areaId,
                    );

                    const action = record.actions.find(
                      item => item.code === change.action,
                    );

                    return (
                      <li
                        key={permissionKey(
                          change.areaId,
                          change.action,
                        )}
                      >
                        <strong>
                          {change.enabled ? 'Allow' : 'Remove'}
                        </strong>
                        {' '}
                        {action?.label} — {area?.label}
                      </li>
                    );
                  })}
                </ul>

                <div className="roles-actions">
                  <button
                    type="button"
                    disabled={saving || mustReload}
                    onClick={() => setReviewing(false)}
                  >
                    Back to editing
                  </button>

                  <button
                    type="button"
                    className="roles-primary"
                    disabled={saving || mustReload}
                    onClick={() => void saveChanges()}
                  >
                    {saving ? 'Saving…' : 'Confirm changes'}
                  </button>
                </div>
              </section>
            )}
          </div>

          {!selectedId ? (
            <div className="roles-empty">
              <ShieldCheck size={42} aria-hidden="true" />
              <p>Select a role to view its permissions.</p>
            </div>
          ) : loading ? (
            <p className="roles-empty" role="status">
              Loading permissions…
            </p>
          ) : record ? (
            <>
              {!record.canEdit && (
                <p className="roles-readonly">
                  You can view these permissions but cannot change them.
                </p>
              )}

              {record.areas.length === 0 ? (
                <p className="roles-empty">
                  No permissions were returned for this role.
                </p>
              ) : (
                <div className="roles-table-scroll">
                  <table>
                    <caption className="roles-sr-only">
                      Permissions for {selectedRole?.label}
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">Area</th>

                        {record.actions.map(action => (
                          <th scope="col" key={action.code}>
                            {action.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {record.areas.map(area => (
                        <tr key={area.id}>
                          <th scope="row">{area.label}</th>

                          {record.actions.map(action => {
                            const permission =
                              area.permissions.find(
                                item => item.action === action.code,
                              );

                            if (!permission) {
                              return (
                                <td key={action.code}>
                                  <span aria-label="Not applicable">—</span>
                                </td>
                              );
                            }

                            const protectedPermission =
                              !record.canEdit || !permission.editable;

                            const key = permissionKey(
                              area.id,
                              action.code,
                            );

                            return (
                              <td key={action.code}>
                                <div className="roles-cell">
                                  <input
                                    type="checkbox"
                                    aria-label={`${action.label}: ${area.label}`}
                                    checked={values[key] ?? permission.enabled}
                                    disabled={
                                      protectedPermission ||
                                      saving ||
                                      reviewing ||
                                      mustReload
                                    }
                                    onChange={event => {
                                      const enabled = event.target.checked;

                                      setValues(current => ({
                                        ...current,
                                        [key]: enabled,
                                      }));

                                      setMessage('');
                                    }}
                                  />

                                  {protectedPermission && (
                                    <span title="Read-only permission">
                                      <LockKeyhole
                                        size={13}
                                        aria-hidden="true"
                                      />
                                      <span className="roles-sr-only">
                                        Read-only
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!reviewing && (
                <footer className="roles-footer">
                  <span role="status">
                    {dirty
                      ? `${changes.length} unsaved changes`
                      : 'No unsaved changes'}
                  </span>

                  <div className="roles-actions">
                    <button
                      type="button"
                      disabled={!dirty || saving}
                      onClick={cancelChanges}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="roles-primary"
                      disabled={
                        !dirty ||
                        !record.canEdit ||
                        saving ||
                        mustReload
                      }
                      onClick={() => {
                        setError('');
                        setReviewing(true);
                      }}
                    >
                      Review changes
                    </button>
                  </div>
                </footer>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}