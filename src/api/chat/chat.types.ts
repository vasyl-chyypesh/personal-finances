import type { Currency, LedgerEntryType } from '../ledger/ledger.types.js';
import type { LocalizedName } from '../categories/categories.types.js';

/**
 * A draft ledger entry extracted from a chat message. Mirrors
 * `CreateLedgerEntryDto`, except `categoryId` may be `null` when the message
 * could not be mapped to a known category — the client must resolve it before
 * the draft can be saved via `POST /api/ledger`.
 */
export interface DraftLedgerEntry {
  type: LedgerEntryType;
  /** Integer minor units (cents). */
  amount: number;
  currency: Currency;
  categoryId: number | null;
  description?: string;
  date: string;
}

/** Fields the user should double-check (defaulted or low-confidence). */
export type UncertainField = 'type' | 'amount' | 'currency' | 'category' | 'date';

export interface ChatExtractResult {
  draft: DraftLedgerEntry;
  /** Fields that were assumed (defaulted) or the model was unsure about. */
  uncertainFields: UncertainField[];
  /** True when no category resolved; the client must require one before saving. */
  unresolvedCategory: boolean;
}

export interface ChatStatus {
  /** Whether the feature is configured (a model URI is set). */
  available: boolean;
  /** Whether a model file is already present locally (no download on next use). */
  ready: boolean;
}

/**
 * Raw structured output from the LLM. Every field is nullable: `null` means the
 * message didn't state it (or the model was unsure). The service applies
 * defaults, converts the amount to cents, and resolves the category slug.
 */
export interface RawExtraction {
  type: LedgerEntryType | null;
  /** Amount in major units (e.g. 150.5), converted to cents by the service. */
  amountMajor: number | null;
  currency: Currency | null;
  categorySlug: string | null;
  description: string | null;
  /** ISO date (YYYY-MM-DD) or `null`. */
  date: string | null;
  /** Fields the model flagged as uncertain. */
  uncertainFields: UncertainField[];
}

/** Minimal category shape the extractor needs to constrain/resolve slugs. */
export interface ExtractCategory {
  slug: string;
  names: LocalizedName;
}

export interface ExtractContext {
  categories: ExtractCategory[];
  /** Today's date (ISO) so the model can resolve relative dates. */
  today: string;
}

/**
 * Turns a free-text message into a {@link RawExtraction}. Implemented by the
 * node-llama-cpp backed extractor in `chat.llm.ts`; injected as a fake in tests
 * so no model is downloaded or loaded.
 */
export interface ILedgerExtractor {
  /** Whether the feature is configured (a model URI is set). */
  isAvailable(): boolean;
  /** Whether a model file already exists locally (no download needed next use). */
  isReady(): boolean;
  extract(message: string, ctx: ExtractContext): Promise<RawExtraction>;
}
