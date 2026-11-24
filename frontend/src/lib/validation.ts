/**
 * validation.ts
 *
 * Client-side input validation for the subscription form.
 * Pure functions — no side effects, no async.
 *
 * Requirements: 10.1, 10.9
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Map of field name → error message. Empty object means all fields are valid. */
export interface FieldErrors {
  merchantAddress?: string;
  tokenAddress?: string;
  amount?: string;
  interval?: string;
}

// ─── Transaction size preflight ───────────────────────────────────────────────

/** Result of a transaction size preflight check. */
export interface TransactionSizeCheckResult {
  /** True when the transaction is within all limits. */
  ok: boolean;
  /**
   * Human-readable error message when ok is false.
   * Includes the specific limit that was exceeded and how to fix it.
   */
  error?: string;
  /** Number of operations counted. */
  operationCount: number;
  /** Estimated XDR byte size of the transaction envelope. */
  estimatedBytes: number;
}

/** Raw string values from the subscription form inputs. */
export interface SubscriptionFormValues {
  merchantAddress: string;
  tokenAddress: string;
  amount: string;
  interval: string;
}

// ─── Interval bounds ──────────────────────────────────────────────────────────

export const MIN_INTERVAL_SECONDS = 86_400;      // 1 day
export const MAX_INTERVAL_SECONDS = 31_536_000;  // 365 days
export const DEFAULT_INTERVAL_SECONDS = 2_592_000; // 30 days

// ─── Address validators ───────────────────────────────────────────────────────

/** Returns true for a valid Stellar G-address (56-char base32, starts with G). */
export function isValidGAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr.trim());
}

/** Returns true for a valid Stellar contract C-address (56-char base32, starts with C). */
export function isValidCAddress(addr: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(addr.trim());
}

// ─── Form validator ───────────────────────────────────────────────────────────

/**
 * Validate all subscription form fields.
 *
 * @param values  Raw form values (strings from <input> elements).
 * @returns       FieldErrors map. Empty = all valid.
 */
export function validateSubscriptionForm(
  values: SubscriptionFormValues,
): FieldErrors {
  const errors: FieldErrors = {};

  // merchantAddress — valid Stellar G-address
  if (!values.merchantAddress.trim()) {
    errors.merchantAddress = 'Merchant address is required.';
  } else if (!isValidGAddress(values.merchantAddress)) {
    errors.merchantAddress =
      'Must be a valid Stellar G-address (56 characters, starts with G).';
  }

  // tokenAddress — valid Stellar C-address (contract)
  if (!values.tokenAddress.trim()) {
    errors.tokenAddress = 'Token contract address is required.';
  } else if (!isValidCAddress(values.tokenAddress)) {
    errors.tokenAddress =
      'Must be a valid Stellar C-address (56 characters, starts with C).';
  }

  // amount — positive integer
  const amountNum = Number(values.amount);
  if (!values.amount.trim()) {
    errors.amount = 'Amount is required.';
  } else if (!Number.isInteger(amountNum) || isNaN(amountNum)) {
    errors.amount = 'Amount must be a whole number.';
  } else if (amountNum <= 0) {
    errors.amount = 'Amount must be greater than 0.';
  }

  // interval — seconds in [86400, 31536000]
  const intervalNum = Number(values.interval);
  if (!values.interval.trim()) {
    errors.interval = 'Interval is required.';
  } else if (!Number.isInteger(intervalNum) || isNaN(intervalNum)) {
    errors.interval = 'Interval must be a whole number of seconds.';
  } else if (intervalNum < MIN_INTERVAL_SECONDS) {
    errors.interval = `Minimum interval is ${MIN_INTERVAL_SECONDS.toLocaleString()} seconds (1 day).`;
  } else if (intervalNum > MAX_INTERVAL_SECONDS) {
    errors.interval = `Maximum interval is ${MAX_INTERVAL_SECONDS.toLocaleString()} seconds (365 days).`;
  }

  return errors;
}

/** Returns true when a FieldErrors object has no error entries. */
export function isFormValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ─── Transaction size preflight ───────────────────────────────────────────────

/**
 * Validate a prepared transaction's operation count and byte size against
 * the configured network limits before opening the wallet signing prompt.
 *
 * Both limits are sourced from constants/network.ts, which reads from
 * environment variables and falls back to Stellar protocol defaults
 * (100 operations, 71 680 bytes). No magic numbers live here.
 *
 * Call this after prepareTransaction() — the prepared XDR is used to
 * measure the actual payload size — and before signTx().
 *
 * @param xdr               Base-64 or raw XDR string of the prepared transaction.
 * @param operationCount    Number of operations in the transaction envelope.
 * @param maxOperations     Maximum operations allowed (from network config).
 * @param maxBytes          Maximum XDR byte size allowed (from network config).
 * @returns                 TransactionSizeCheckResult with ok, error, counts.
 */
export function validateTransactionSize(
  xdr: string,
  operationCount: number,
  maxOperations: number,
  maxBytes: number,
): TransactionSizeCheckResult {
  // Measure the encoded byte length.
  // XDR strings from stellar-sdk are base64-encoded; convert to byte count.
  // If the string is not base64 (e.g. raw binary), use length directly.
  const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(xdr);
  const estimatedBytes = isBase64
    ? Math.ceil((xdr.length * 3) / 4)
    : new TextEncoder().encode(xdr).length;

  if (operationCount > maxOperations) {
    return {
      ok: false,
      error:
        `This transaction contains ${operationCount} operation${operationCount !== 1 ? 's' : ''}, ` +
        `which exceeds the network limit of ${maxOperations}. ` +
        `Split the batch into groups of ${maxOperations} or fewer operations and submit each group separately.`,
      operationCount,
      estimatedBytes,
    };
  }

  if (estimatedBytes > maxBytes) {
    return {
      ok: false,
      error:
        `The transaction payload is approximately ${estimatedBytes.toLocaleString()} bytes, ` +
        `which exceeds the network limit of ${maxBytes.toLocaleString()} bytes. ` +
        `Reduce the number of operations or the size of the contract call arguments, ` +
        `then resubmit.`,
      operationCount,
      estimatedBytes,
    };
  }

  return { ok: true, operationCount, estimatedBytes };
}
