export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? 'https://soroban-testnet.stellar.org';

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
  'Test SDF Network ; September 2015';

export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ?? '';

export const NETWORK_NAME =
  NETWORK_PASSPHRASE === 'Public Global Stellar Network ; September 2015'
    ? 'Mainnet'
    : 'Testnet';

// ── Transaction size limits ────────────────────────────────────────────────────
//
// These values match the Stellar protocol defaults for Soroban transactions.
// Override via environment variables when running against a custom network.
//
// References:
//   • MAX_OPERATIONS_PER_TX: Stellar protocol enforces max 100 operations per
//     transaction envelope. Soroban transactions are further constrained to 1
//     Soroban operation (the invoke call), but the outer limit is 100.
//     Source: https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol
//   • MAX_TX_BYTE_SIZE: Soroban's configurable resource limit for transaction
//     size. The protocol default for Soroban is 71,680 bytes (70 KB). The raw
//     XDR envelope budget is set via ledger-wide `configSettingContract*`
//     entries. 71680 is the default from stellar-core CAP-0046.
//     Source: https://github.com/stellar/stellar-core CAP-0046 / CAP-0051

/** Maximum number of operations allowed in a single transaction envelope. */
export const MAX_OPERATIONS_PER_TX: number = (() => {
  const raw = process.env.NEXT_PUBLIC_MAX_OPERATIONS_PER_TX;
  const parsed = raw !== undefined ? parseInt(raw, 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 100;
})();

/** Maximum allowed transaction size in bytes (XDR envelope). */
export const MAX_TX_BYTE_SIZE: number = (() => {
  const raw = process.env.NEXT_PUBLIC_MAX_TX_BYTE_SIZE;
  const parsed = raw !== undefined ? parseInt(raw, 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 71_680;
})();
