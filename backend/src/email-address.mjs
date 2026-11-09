import { promises as dns } from 'node:dns';

/**
 * Email validation shared by account creation, self-registration and email
 * changes. Beyond the format check, the domain is asked whether it can receive
 * mail at all, which catches typos and invented domains.
 */

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UNREACHABLE_EMAIL =
  'That email domain cannot receive mail. Check the address for a typo.';

// Names reserved for documentation and testing (RFC 2606/6761). They never
// resolve publicly, so the reachability check would reject the test fixtures.
const reservedDomain =
  /(^|\.)(example\.(com|net|org)|test|invalid|localhost|local|example)$/i;

export function normaliseEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email) {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    emailPattern.test(email)
  );
}

/**
 * True when the domain publishes a mail exchanger, or — when it publishes no
 * MX record at all — an address record, which RFC 5321 allows as a fallback.
 * A DNS outage returns true so a resolver problem never blocks an account.
 */
export async function domainAcceptsMail(email) {
  if (process.env.SKIP_EMAIL_DNS_CHECK === 'true') return true;

  const domain = email.split('@')[1];

  if (!domain || reservedDomain.test(domain)) return true;

  try {
    const records = await dns.resolveMx(domain);

    if (records.length) {
      // A lone null MX ("0 .") is an explicit refusal to accept mail.
      return records.some(
        record => record.exchange && record.exchange !== '.',
      );
    }
  } catch (error) {
    if (error.code !== 'ENOTFOUND' && error.code !== 'ENODATA') {
      return true;
    }
  }

  for (const record of ['resolve4', 'resolve6']) {
    try {
      const addresses = await dns[record](domain);
      if (addresses.length) return true;
    } catch {
      // Try the next record type, then give up.
    }
  }

  return false;
}
