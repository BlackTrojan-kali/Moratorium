import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  depositApi,
  DepositError,
  downloadDocument,
} from './api';

import {
  bytes,
  dateTime,
  DocumentsTable,
  errorText,
  LoadState,
  money,
  Panel,
  useLoad,
} from './shared';

import {
  checkDocuments,
  checkFile,
  checkInput,
  formValues,
} from './validation';

import type {
  Deposit,
  DepositDocument,
  DocumentRule,
  Issue,
  Options,
} from './types';

import '../../styles/deposit.css';

const steps = [
  'Employer',
  'Request',
  'Documents',
  'Review',
];

export function DepositEditor({
  embedded = false,
  onComplete,
}: {
  embedded?: boolean;
  onComplete?: () => void;
}) {
  const { requestId } =
    useParams<{ requestId: string }>();

  const state = useLoad(
    `editor:${requestId ?? 'new'}`,
    async signal => {
      const [options, record] = await Promise.all([
        depositApi.options(signal),
        requestId
          ? depositApi.get(requestId, signal)
          : Promise.resolve(null),
      ]);

      return { options, record };
    },
  );

  return (
    <div className="deposit-module">
      <LoadState
        loading={state.loading}
        error={state.error}
        retry={state.reload}
      />

      {state.data && (
        <Editor
          key={`${requestId ?? 'new'}:${state.data.record?.version ?? 0}`}
          options={state.data.options}
          initialRecord={state.data.record}
          reload={state.reload}
          embedded={embedded}
          onComplete={onComplete}
        />
      )}
    </div>
  );
}

function Editor({
  options,
  initialRecord,
  reload,
  embedded,
  onComplete,
}: {
  options: Options;
  initialRecord: Deposit | null;
  reload: () => void;
  embedded: boolean;
  onComplete?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const queryStep = Number(
    new URLSearchParams(location.search).get('step'),
  );

  const [step, setStep] = useState(
    Number.isInteger(queryStep) &&
    queryStep >= 0 &&
    queryStep < steps.length
      ? queryStep
      : 0,
  );

  const [record, setRecord] = useState(initialRecord);

  const [form, setForm] = useState(() =>
    formValues(initialRecord?.fields),
  );

  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(() =>
    new URLSearchParams(location.search).has('saved')
      ? 'Draft saved.'
      : '',
  );
  const [busy, setBusy] = useState(false);
  const [mustReload, setMustReload] = useState(false);
  const [acknowledged, setAcknowledged] =
    useState(false);

  const lock = useRef(false);
  const createKey = useRef(crypto.randomUUID());
  const submitKey = useRef(crypto.randomUUID());
  const errorBox = useRef<HTMLDivElement>(null);

  const dirty =
    JSON.stringify(form) !==
    JSON.stringify(formValues(record?.fields));

  // Everything still missing before this draft can be submitted. Shown on the
  // review step so a disabled button never comes as a surprise.
  const blockers =
    record && !dirty
      ? [
          ...checkInput(form, options, true).issues,
          ...checkDocuments(record, options),
        ]
      : [];

  const type = options.requestTypes.find(
    item => item.code === form.typeCode,
  );

  const editable =
    !record || record.permissions.edit;

  const disabled =
    busy || mustReload || !editable;

  const employer =
    record?.employer ?? options.employer;

  const debt =
    record ? record.debt : options.debt;

  useEffect(() => {
    if (issues.length || error) {
      errorBox.current?.focus();
    }
  }, [issues, error]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || lock.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    const warnLink = (event: MouseEvent) => {
      if (!dirty && !lock.current) return;

      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const anchor =
        event.target instanceof Element
          ? event.target.closest('a')
          : null;

      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) return;

      if (
        lock.current ||
        !window.confirm(
          'You have unsaved changes. Leave this page?',
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', warn);
    window.document.addEventListener(
      'click',
      warnLink,
      true,
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        warn,
      );

      window.document.removeEventListener(
        'click',
        warnLink,
        true,
      );
    };
  }, [dirty]);

  async function work(
    action: () => Promise<void>,
    mutation = true,
  ) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    setIssues([]);

    try {
      await action();
    } catch (caught) {
      setError(errorText(caught));

      if (caught instanceof DepositError) {
        setIssues(caught.issues);
      }

      if (
        mutation &&
        (
          !(caught instanceof DepositError) ||
          caught.status === 0 ||
          caught.status >= 500 ||
          [409, 412].includes(caught.status)
        )
      ) {
        setMustReload(true);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  /**
   * Saves the draft. Returns `false` when nothing was stored, so callers can
   * keep the user on the current step. `targetStep` travels in the URL when a
   * first save creates the request and the editor reloads it.
   */
  async function persist(
    targetStep = step,
  ): Promise<boolean> {
    const result = checkInput(
      form,
      options,
      false,
    );

    if (result.issues.length) {
      setIssues(result.issues);
      return false;
    }

    let stored = false;

    await work(async () => {
      const saved = record
        ? await depositApi.save(
            record,
            result.input,
            options.csrfToken,
          )
        : await depositApi.create(
            result.input,
            options.csrfToken,
            createKey.current,
          );

      setRecord(saved);
      setForm(formValues(saved.fields));
      setAcknowledged(false);
      setMessage('Draft saved.');
      stored = true;

      if (!record && !embedded) {
        navigate(
          `/requests/${encodeURIComponent(saved.id)}/edit?step=${targetStep}&saved=1`,
          { replace: true },
        );
      }
    });

    return stored;
  }

  function save(): void {
    void persist();
  }

  /**
   * The footer offers Delete rather than Save: drafts save themselves when you
   * continue, and a draft that is no longer wanted should be removable.
   */
  function discard(): void {
    if (!record) return;

    if (
      !window.confirm(
        `Delete draft ${record.reference}? Its documents will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }

    void work(async () => {
      await depositApi.discard(
        record,
        options.csrfToken,
      );

      navigate('/requests', { replace: true });
      onComplete?.();
    });
  }

  /**
   * The Documents and Review steps only mean something once the request
   * exists, so moving on from the Request step saves the draft first.
   */
  async function next(): Promise<void> {
    if (step === 1 && !await persist(step + 1)) {
      return;
    }

    setStep(value =>
      Math.min(value + 1, steps.length - 1),
    );
  }

  function upload(
    rule: DocumentRule,
    file: File,
  ) {
    if (!record || dirty) {
      setError(
        'Save the draft before uploading documents.',
      );
      return;
    }

    const problem = checkFile(
      file,
      rule,
      record.documents.filter(
        item => item.category === rule.code,
      ).length,
    );

    if (problem) {
      setIssues([{
        field: 'documents',
        message: problem,
      }]);
      return;
    }

    void work(async () => {
      setRecord(
        await depositApi.upload(
          record,
          rule.code,
          file,
          options.csrfToken,
          `${rule.label} - ${file.name}`,
        ),
      );

      setAcknowledged(false);
      setMessage(
        'File received. Its format was checked; malware scanning is not configured.',
      );
    });
  }

  function remove(document: DepositDocument) {
    if (
      !record ||
      !window.confirm(
        `Remove ${document.fileName} from this draft?`,
      )
    ) return;

    void work(async () => {
      setRecord(
        await depositApi.remove(
          record,
          document.id,
          options.csrfToken,
        ),
      );

      setAcknowledged(false);
      setMessage('Document removed.');
    });
  }

  async function serverCheck(): Promise<boolean> {
    if (!record) return false;

    const local = [
      ...checkInput(form, options, true).issues,
      ...checkDocuments(record, options),
    ];

    if (local.length) {
      setIssues(local);
      return false;
    }

    const result = await depositApi.validate(
      record,
      options.csrfToken,
    );

    if (!result.valid) {
      setIssues(
        result.issues.length
          ? result.issues
          : [{
              field: 'request',
              message:
                'This request is not ready for submission.',
            }],
      );

      return false;
    }

    return true;
  }

  function submit() {
    if (!record || dirty || !acknowledged) return;

    void work(async () => {
      if (!await serverCheck()) return;

      const result = await depositApi.submit(
        record,
        options.csrfToken,
        submitKey.current,
      );

      if (
        !result.receipt?.reference ||
        !result.receipt.submittedAt ||
        result.deposit.id !== record.id
      ) {
        throw new DepositError(
          'Submission could not be confirmed. Reload the request before retrying.',
        );
      }

      setRecord(result.deposit);

      navigate(
        `/requests/${encodeURIComponent(result.deposit.id)}/receipt`,
        { replace: true },
      );
      onComplete?.();
    });
  }

  function update(
    key: keyof typeof form,
    value: string,
  ) {
    setForm(current => {
      const next = { ...current, [key]: value };

      // The amount the employer deposits is 30% of the declared debt, so it is
      // filled in as soon as the debt is known. The employer can still override it.
      if (key === 'debtAmount' && type?.requiresAdvance) {
        const debt = Number(value);

        next.advanceAmount =
          Number.isSafeInteger(debt) && debt > 0
            ? String(Math.ceil(debt * 0.3))
            : '';
      }

      return next;
    });

    setAcknowledged(false);
    setIssues([]);
    setMessage('');
  }

  return (
    <>
      <header className="deposit-heading">
        <div>
          <p className="deposit-eyebrow">
            Request deposit
          </p>

          <h1>
            {record
              ? `Edit ${record.reference}`
              : 'New request'}
          </h1>

          <p>
            Complete your request and attach the
            required supporting documents.
          </p>
        </div>

        {!embedded && <Link to="/requests">My requests</Link>}
      </header>

      {record?.corrections.length ? (
        <Panel title="Corrections requested">
          <ul>
            {record.corrections.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {!editable && (
        <p role="status">
          This request cannot be edited.{' '}
          <Link
            to={`/requests/${encodeURIComponent(record!.id)}`}
          >
            Open request details
          </Link>.
        </p>
      )}

      <div
        ref={errorBox}
        tabIndex={-1}
        className="deposit-feedback"
      >
        {error && <p role="alert">{error}</p>}

        {issues.length > 0 && (
          <div role="alert">
            <strong>Please review the following:</strong>

            <ul>
              {issues.map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {message && <p role="status">{message}</p>}

      {mustReload && (
        <div
          className="deposit-notice"
          role="alert"
        >
          <p>
            The last change could not be confirmed.
            Check the saved record before making
            another change.
          </p>

          {record ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    'Reload the saved draft and discard unsaved field changes?',
                  )
                ) reload();
              }}
            >
              Reload saved draft
            </button>
          ) : (
            <Link to="/requests">
              Check my requests
            </Link>
          )}
        </div>
      )}

      <nav aria-label="Request steps">
        <ol className="deposit-steps">
          {steps.map((label, index) => {
            // Documents and Review work on a saved draft, so they stay closed
            // until the request exists.
            const locked = !record && index > 1;

            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={busy || locked}
                  title={
                    locked
                      ? 'Choose a request type, then continue from the Request step to open this step.'
                      : undefined
                  }
                  aria-current={
                    step === index ? 'step' : undefined
                  }
                  onClick={() => setStep(index)}
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {!record && (
        <p className="deposit-hint">
          Steps 3 and 4 open once the draft is saved:
          choose a request type on the Request step and
          continue.
        </p>
      )}

      <form
        onSubmit={event => event.preventDefault()}
        aria-busy={busy}
      >
        {step === 0 && (
          <Panel title="Employer information">
            <dl className="deposit-facts">
              <div>
                <dt>Employer</dt>
                <dd>{employer.name}</dd>
              </div>

              <div>
                <dt>CNPS number</dt>
                <dd>{employer.cnpsNumber}</dd>
              </div>

              <div>
                <dt>Email</dt>
                <dd>{employer.email ?? 'Unavailable'}</dd>
              </div>

              <div>
                <dt>Address</dt>
                <dd>{employer.address ?? 'Unavailable'}</dd>
              </div>

              <div>
                <dt>Employer status</dt>
                <dd>
                  {employer.active === null
                    ? 'Unavailable'
                    : employer.active
                      ? 'Active'
                      : 'Inactive'}
                </dd>
              </div>
            </dl>

            <h3>Reference debt information</h3>

            {debt ? (
              <dl className="deposit-facts">
                <div>
                  <dt>Principal</dt>
                  <dd>
                    {money(debt.principal, debt.currency)}
                  </dd>
                </div>

                <div>
                  <dt>Penalties</dt>
                  <dd>
                    {money(debt.penalties, debt.currency)}
                  </dd>
                </div>

                <div>
                  <dt>Last retrieved</dt>
                  <dd>{dateTime(debt.observedAt)}</dd>
                </div>
              </dl>
            ) : (
              <p>Debt information unavailable.</p>
            )}
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Request information">
            <fieldset disabled={disabled}>
              <div className="deposit-fields">
                {([['contactName','Contact name'],['contactEmail','Contact email'],['address','Registered address'],['debtAmount','Declared total debt (XAF)']] as const).map(([key,label])=>(<label key={key}>{label}<input value={form[key]} onChange={event=>update(key,event.target.value)} /></label>))}
                <p>The debt amount is your declaration and will be checked against the supporting statement. Reference-system debt is not yet connected.</p>
                {form.typeCode==='moratorium_remission'&&<label>Reason for remission<textarea value={form.remissionReason} onChange={event=>update('remissionReason',event.target.value)} /></label>}
                <label>
                  Request type

                  <select
                    value={form.typeCode}
                    onChange={event =>
                      update('typeCode', event.target.value)
                    }
                  >
                    <option value="">
                      Select a request type
                    </option>

                    {options.requestTypes.map(item => (
                      <option
                        key={item.code}
                        value={item.code}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                {type?.requiresMonths && (
                  <label>
                    Requested number of months

                    <input
                      inputMode="numeric"
                      type="number"
                      step="1"
                      min={type.minMonths ?? undefined}
                      max={type.maxMonths ?? undefined}
                      value={form.months}
                      onChange={event =>
                        update('months', event.target.value)
                      }
                    />

                    <small>
                      Minimum: {type.minMonths ?? 'Not specified'}
                      {' · '}
                      Maximum: {type.maxMonths ?? 'Not specified'}
                    </small>
                  </label>
                )}

                {type?.requiresAdvance && (
                  <label>
                    Amount to deposit ({options.currency})

                    <input
                      inputMode="decimal"
                      value={form.advanceAmount}
                      onChange={event =>
                        update(
                          'advanceAmount',
                          event.target.value,
                        )
                      }
                    />

                    <small>
                      30% of the declared debt — filled in automatically and
                      adjustable. Whole XAF amounts only.
                    </small>
                  </label>
                )}
              </div>
            </fieldset>
          </Panel>
        )}

        {step === 2 && (
          <Panel title="Supporting documents">
            {!record || dirty ? (
              <div className="deposit-issues">
                <p>
                  {record
                    ? 'Save your field changes before adding or removing documents.'
                    : 'Documents are attached to the saved request, so save the draft first.'}
                </p>

                <div className="deposit-actions">
                  <button
                    type="button"
                    className="deposit-primary"
                    disabled={busy || mustReload}
                    onClick={save}
                  >
                    Save draft
                  </button>
                </div>
              </div>
            ) : null}

            {!type ? (
              <div className="deposit-issues">
                <p>
                  Choose a request type on the
                  Request step to see the documents
                  you need to attach.
                </p>

                <div className="deposit-actions">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    Go to the Request step
                  </button>
                </div>
              </div>
            ) : (
              type.documentRules.map(rule => {
                const present =
                  record?.documents.filter(
                    item => item.category === rule.code,
                  ) ?? [];

                return (
                  <div
                    className="deposit-upload"
                    key={rule.code}
                  >
                    <label htmlFor={`file-${rule.code}`}>
                      <strong>{rule.label}</strong>
                      {' · '}
                      {rule.required ? 'Required' : 'Optional'}
                    </label>

                    <p>
                      {present.some(
                        item => item.scanState === 'ready',
                      )
                        ? 'File format accepted'
                        : 'No accepted file available'}
                    </p>

                    {rule.employerCanUpload ? (
                      <>
                        <small>
                          Accepted: {rule.accept.join(', ')}
                          {' · '}
                          Maximum {bytes(rule.maxBytes)} per file
                          {' · '}
                          Up to {rule.maxFiles} files
                        </small>

                        <input
                          id={`file-${rule.code}`}
                          type="file"
                          accept={rule.accept.join(',')}
                          disabled={
                            disabled ||
                            dirty ||
                            !record?.permissions.upload ||
                            present.length >= rule.maxFiles
                          }
                          onChange={event => {
                            const file =
                              event.target.files?.[0];

                            event.target.value = '';

                            if (file) upload(rule, file);
                          }}
                        />
                      </>
                    ) : (
                      <p>
                        Provided by the responsible office.
                      </p>
                    )}
                  </div>
                );
              })
            )}

            {record && (
              <DocumentsTable
                documents={record.documents}
                busy={busy || mustReload || dirty}
                onDownload={document =>
                  void work(
                    () => downloadDocument(document),
                    false,
                  )
                }
                onRemove={editable ? remove : undefined}
              />
            )}

            {record && (
              <button
                type="button"
                disabled={busy || dirty}
                onClick={reload}
              >
                Refresh document checks
              </button>
            )}
          </Panel>
        )}

        {step === 3 && (
          <Panel title="Review and submit">
            {form.remissionReason && (
              <p>
                Remission grounds:{' '}
                {form.remissionReason}
              </p>
            )}

            <dl className="deposit-facts">
              <div>
                <dt>Employer</dt>
                <dd>{employer.name}</dd>
              </div>

              <div>
                <dt>Request type</dt>
                <dd>{type?.label ?? 'Not selected'}</dd>
              </div>

              <div>
                <dt>Declared debt</dt>
                <dd>
                  {form.debtAmount
                    ? money(
                        form.debtAmount,
                        options.currency,
                      )
                    : 'Not entered'}
                </dd>
              </div>

              <div>
                <dt>Contact</dt>
                <dd>
                  {[form.contactName, form.contactEmail]
                    .filter(Boolean)
                    .join(' · ') || 'Not entered'}
                </dd>
              </div>

              <div>
                <dt>Registered address</dt>
                <dd>{form.address || 'Not entered'}</dd>
              </div>

              {type?.requiresMonths && (
                <div>
                  <dt>Requested months</dt>
                  <dd>{form.months || 'Not entered'}</dd>
                </div>
              )}

              {type?.requiresAdvance && (
                <div>
                  <dt>Amount to deposit</dt>
                  <dd>
                    {money(
                      form.advanceAmount || null,
                      options.currency,
                    )}
                  </dd>
                </div>
              )}

            </dl>

            <p>
              {record
                ? `${record.documents.length} attached documents`
                : 'Draft not yet saved.'}
            </p>

            {record?.documents.length ? (
              <ul>
                {record.documents.map(document => (
                  <li key={document.id}>
                    {document.categoryLabel}: {document.fileName}
                    {' '}({document.scanState})
                  </li>
                ))}
              </ul>
            ) : null}

            {(!record || dirty) && (
              <div className="deposit-issues">
                <p>
                  {record
                    ? 'Save your changes before checking or submitting this request.'
                    : 'Save the draft before checking or submitting it.'}
                </p>

                <div className="deposit-actions">
                  <button
                    type="button"
                    className="deposit-primary"
                    disabled={busy || mustReload}
                    onClick={save}
                  >
                    Save draft
                  </button>
                </div>
              </div>
            )}

            {blockers.length > 0 && (
              <div className="deposit-issues">
                <p>Still to complete before submitting:</p>
                <ul>
                  {blockers.map((issue, index) => (
                    <li key={index}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <label className="deposit-check">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={disabled || !record || dirty}
                onChange={event =>
                  setAcknowledged(event.target.checked)
                }
              />

              I have reviewed the information
              and supporting documents.
            </label>

            <div className="deposit-actions">
              <button
                type="button"
                disabled={disabled || !record || dirty}
                onClick={() =>
                  void work(async () => {
                    if (await serverCheck()) {
                      setMessage(
                        'The saved request passed the current submission checks.',
                      );
                    }
                  }, false)
                }
              >
                Check completeness
              </button>

              <button
                type="button"
                className="deposit-primary"
                disabled={
                  disabled ||
                  dirty ||
                  !record?.permissions.submit ||
                  !acknowledged
                }
                onClick={submit}
              >
                Submit request
              </button>
            </div>

          </Panel>
        )}

        <footer className="deposit-footer">
          <div className="deposit-actions">
            <button
              type="button"
              disabled={busy || step === 0}
              onClick={() =>
                setStep(value => value - 1)
              }
            >
              Back
            </button>

            {step < steps.length - 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void next()}
              >
                Continue
              </button>
            )}
          </div>

          {record?.permissions.discard && (
            <div className="deposit-actions">
              <button
                type="button"
                className="deposit-danger"
                disabled={busy || mustReload}
                onClick={discard}
              >
                Delete draft
              </button>
            </div>
          )}
        </footer>
      </form>
    </>
  );
}