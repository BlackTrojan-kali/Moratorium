import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  BookOpen,
  Building2,
  ChevronDown,
  Clock,
  FileText,
  Mail,
  Phone,
  Search,
  X,
} from 'lucide-react';

import { api } from '../../app/api';
import { useAuth } from '../../app/AuthContext';

import '../../styles/help.css';

interface HelpGuide {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
}

interface HelpQuestion {
  id: string;
  question: string;
  answer: string;
}

interface HelpContent {
  guides: HelpGuide[];
  questions: HelpQuestion[];

  support: {
    contact?: string | null;
    email: string | null;
    phone: string | null;
    hours: string | null;
  };
}

const defaultHelpData: HelpContent = {
  guides: [
    {
      id: 'moratorium-overview',
      title: 'Moratorium Application Process',
      summary: 'Learn how to apply for social security contribution moratoriums and repayment rescheduling.',
      paragraphs: [
        'The MoraPay moratorium management platform enables employers with outstanding social contribution obligations to submit formal moratorium and debt-restructuring requests to CNPS.',
        'Employers can submit a request with supporting documentation, including financial hardship evidence and previous payment records. Once submitted, your request is reviewed by processing officers and verified by financial authorities.',
        'You can track the live status of your application directly from the "My requests" workspace.',
      ],
    },
    {
      id: 'required-documents',
      title: 'Required Documentation',
      summary: 'Essential documents required to prevent delays in application review.',
      paragraphs: [
        'To ensure rapid processing, employers should attach: the latest statement of debt from CNPS, proof of advance deposit, and evidence of financial difficulty. A signed request letter may also be attached, but it is no longer required.',
        'Supported file formats include PDF and common image formats (PNG, JPEG), up to 5 MB per document. Ensure all scans are legible and complete before submission.',
      ],
    },
    {
      id: 'account-security',
      title: 'Managing Your Profile & Security',
      summary: 'How to manage your account details and update your login credentials.',
      paragraphs: [
        'Your profile displays your assigned role and official CNPS identifier. These official identifiers are managed by your organisation and the system administrator.',
        'You can update your personal display name and interface preferences under Settings. To change your account password, visit the Security tab in Settings.',
      ],
    },
  ],
  questions: [
    {
      id: 'q1',
      question: 'How long does a moratorium request review typically take?',
      answer: 'Review time depends on the responsible office and file completeness. Follow updates in your request workspace.',
    },
    {
      id: 'q2',
      question: 'Can I edit my request after submitting?',
      answer: 'Once submitted, a request is locked for evaluation. If additional information is required, a processing officer will return the request to your workspace with specific instructions.',
    },
    {
      id: 'q3',
      question: 'How do I change my official organisation details?',
      answer: 'Official details such as CNPS employer number and registered organisation name are administratively managed. Please contact your system administrator or support desk.',
    },
    {
      id: 'q4',
      question: 'Who should I contact if I am unable to access certain pages?',
      answer: 'Access permissions are tied to your assigned role. If you need elevated access, contact your administrator to update your role permissions.',
    },
  ],
  support: {
    email: null,
    phone: null,
    hours: null,
  },
};

function matchesSearch(
  values: string[],
  query: string,
) {
  const search = query.trim().toLocaleLowerCase();

  return (
    !search ||
    values.some(value =>
      value.toLocaleLowerCase().includes(search),
    )
  );
}

export function Help() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <HelpWorkspace
      key={`${user.id}:${user.role}`}
    />
  );
}

function HelpWorkspace() {
  const { user } = useAuth();

  const [content, setContent] =
    useState<HelpContent | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedGuide, setSelectedGuide] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');
    setContent(null);
    setSelectedGuide(null);

    api<HelpContent>('/help')
      .then(result => {
        if (active) setContent(result);
      })
      .catch(() => {
        if (!active) return;
        // Fall back to default help data so the page remains fully functional
        setContent(defaultHelpData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [revision]);

  const guides =
    content?.guides.filter(guide =>
      matchesSearch(
        [
          guide.title,
          guide.summary,
          ...guide.paragraphs,
        ],
        search,
      ),
    ) ?? [];

  const questions =
    content?.questions.filter(item =>
      matchesSearch(
        [item.question, item.answer],
        search,
      ),
    ) ?? [];

  const activeGuide = guides.find(
    guide => guide.id === selectedGuide,
  );

  const searching = search.trim().length > 0;

  function updateSearch(value: string) {
    setSearch(value);
    setSelectedGuide(null);
  }

  return (
    <div className="help-page">
      <header className="help-heading">
        <h1>Help &amp; Support</h1>

        <p>
          Find guidance and get help with your workspace.
        </p>
      </header>

      <div
        className="help-search"
        role="search"
        aria-label="Search help"
      >
        <Search size={22} aria-hidden="true" />

        <label
          className="help-sr-only"
          htmlFor="help-search"
        >
          Search help topics
        </label>

        <input
          id="help-search"
          type="search"
          placeholder="Search help topics"
          value={search}
          disabled={!content || loading}
          onChange={event =>
            updateSearch(event.target.value)
          }
        />

        {search && (
          <button
            type="button"
            className="help-icon-button"
            aria-label="Clear search"
            onClick={() => updateSearch('')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {loading && (
        <section
          className="help-card help-state"
          role="status"
        >
          Loading help information…
        </section>
      )}

      {error && (
        <section
          className="help-card help-state"
          role="alert"
        >
          <h2>Help information could not be loaded</h2>
          <p>{error}</p>

          <button
            type="button"
            className="help-button"
            onClick={() =>
              setRevision(value => value + 1)
            }
          >
            Try again
          </button>
        </section>
      )}

      {content && !loading && (
        <>
          {searching && (
            <p
              className="help-search-results"
              role="status"
            >
              {guides.length} guides and{' '}
              {questions.length} questions found.
            </p>
          )}

          <ContactSupport
            support={content.support}
            canConfigure={user?.role === 'administrator'}
          />

          {guides.length > 0 && (
            <section
              className="help-guides"
              aria-label="Quick guides"
            >
              {guides.map((guide, index) => (
                <button
                  key={guide.id}
                  type="button"
                  className="help-guide"
                  aria-expanded={
                    selectedGuide === guide.id
                  }
                  aria-controls="help-guide-content"
                  onClick={() =>
                    setSelectedGuide(current =>
                      current === guide.id
                        ? null
                        : guide.id,
                    )
                  }
                >
                  <span className="help-guide-icon">
                    {index === 0 ? (
                      <FileText
                        size={32}
                        aria-hidden="true"
                      />
                    ) : (
                      <BookOpen
                        size={32}
                        aria-hidden="true"
                      />
                    )}
                  </span>

                  <span className="help-guide-copy">
                    <strong>{guide.title}</strong>
                    <span>{guide.summary}</span>
                  </span>

                  <ChevronDown
                    className="help-guide-chevron"
                    size={19}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </section>
          )}

          <section
            id="help-guide-content"
            className="help-card help-guide-content"
            hidden={!activeGuide}
            aria-labelledby="help-guide-title"
          >
            {activeGuide && (
              <>
                <div className="help-card-heading">
                  <h2 id="help-guide-title">
                    {activeGuide.title}
                  </h2>

                  <button
                    type="button"
                    className="help-icon-button"
                    aria-label="Close guide"
                    onClick={() =>
                      setSelectedGuide(null)
                    }
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>

                {activeGuide.paragraphs.map(
                  (paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ),
                )}
              </>
            )}
          </section>

          <section
            className="help-card"
            aria-labelledby="help-faq-title"
          >
            <h2 id="help-faq-title">
              Frequently asked questions
            </h2>

            {questions.length > 0 ? (
              <div className="help-faq-list">
                {questions.map(item => (
                  <details
                    className="help-faq"
                    key={item.id}
                  >
                    <summary>
                      <span>{item.question}</span>

                      <ChevronDown
                        size={19}
                        aria-hidden="true"
                      />
                    </summary>

                    <div className="help-answer">
                      <p>{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="help-empty">
                <p>
                  {searching
                    ? 'No questions match your search.'
                    : 'No frequently asked questions are available yet.'}
                </p>

                {searching && (
                  <button
                    type="button"
                    className="help-button"
                    onClick={() => updateSearch('')}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface ContactSupportProps {
  support: HelpContent['support'];
  canConfigure: boolean;
}

/**
 * Support channels. Kept at the top of the page so that the people who
 * need help find a way to reach us without scrolling.
 */
function ContactSupport({
  support,
  canConfigure,
}: ContactSupportProps) {
  const configured = Boolean(
    support.email ||
      support.phone ||
      support.hours ||
      support.contact,
  );

  return (
    <section
      className="help-card help-contact"
      aria-labelledby="help-contact-title"
    >
      <h2 id="help-contact-title">Contact support</h2>

      <p className="help-contact-intro">
        Use the official support channels for your
        organisation.
      </p>

      {configured ? (
        <dl className="help-contact-list">
          {support.contact &&
            !support.email &&
            !support.phone && (
              <div className="help-contact-row">
                <span className="help-contact-icon">
                  <Building2 size={21} aria-hidden="true" />
                </span>

                <div>
                  <dt>Support contact</dt>
                  <dd>{support.contact}</dd>
                </div>
              </div>
            )}

          {support.email && (
            <div className="help-contact-row">
              <span className="help-contact-icon">
                <Mail size={21} aria-hidden="true" />
              </span>

              <div>
                <dt>Email</dt>
                <dd>
                  <a
                    className="help-contact-link"
                    href={`mailto:${support.email}`}
                  >
                    {support.email}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {support.phone && (
            <div className="help-contact-row">
              <span className="help-contact-icon">
                <Phone size={21} aria-hidden="true" />
              </span>

              <div>
                <dt>Phone</dt>
                <dd>
                  <a
                    className="help-contact-link"
                    href={`tel:${support.phone.replace(/[\s-]/g, '')}`}
                  >
                    {support.phone}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {support.hours && (
            <div className="help-contact-row">
              <span className="help-contact-icon">
                <Clock size={21} aria-hidden="true" />
              </span>

              <div>
                <dt>Support hours</dt>
                <dd>{support.hours}</dd>
              </div>
            </div>
          )}
        </dl>
      ) : (
        <div className="help-empty">
          <p>
            No support channel has been configured yet. Ask
            your system administrator to record one under
            System settings.
          </p>

          {canConfigure && (
            <Link
              className="help-button"
              to="/admin/settings"
            >
              Open system settings
            </Link>
          )}
        </div>
      )}

      <div className="help-contact-links">
        <Link className="help-button" to="/">
          Return to dashboard
        </Link>

        <Link className="help-button" to="/profile">
          View your profile
        </Link>
      </div>
    </section>
  );
}