import { HttpError } from '../shared/errors/httpError.js';
import { CODES } from '../shared/errors/codes.js';
import type { ICategoriesRepository } from '../categories/categories.repository.js';
import type { Category } from '../categories/categories.types.js';
import type {
  ChatExtractResult,
  ChatStatus,
  DraftLedgerEntry,
  ILedgerExtractor,
  RawExtraction,
  UncertainField,
} from './chat.types.js';

/** Local-time ISO date (YYYY-MM-DD), matching how the ledger stores dates. */
function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True only for a real calendar date in YYYY-MM-DD form. */
function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export class ChatService {
  constructor(
    private readonly extractor: ILedgerExtractor,
    private readonly categoriesRepo: ICategoriesRepository,
  ) {}

  status(): ChatStatus {
    return { available: this.extractor.isAvailable(), ready: this.extractor.isReady() };
  }

  async extract(message: string): Promise<ChatExtractResult> {
    if (!this.extractor.isAvailable()) {
      throw new HttpError('AI chat is not configured', CODES.CHAT_UNAVAILABLE, 503);
    }

    const categories = this.categoriesRepo.findAll(); // non-deleted only
    const today = todayISO();
    const raw = await this.extractor.extract(message, {
      categories: categories.map((c) => ({ slug: c.slug, names: c.names })),
      today,
    });

    return this.toResult(raw, categories, today);
  }

  /** Apply defaults, convert amount to cents, resolve the category, flag uncertainty. */
  private toResult(raw: RawExtraction, categories: Category[], today: string): ChatExtractResult {
    const uncertain = new Set<UncertainField>(raw.uncertainFields ?? []);

    let type = raw.type;
    if (type == null) {
      type = 'expense';
      uncertain.add('type');
    }

    let currency = raw.currency;
    if (currency == null) {
      currency = 'UAH';
      uncertain.add('currency');
    }

    let date = raw.date;
    if (date == null || !isValidISODate(date)) {
      date = today;
      uncertain.add('date');
    }

    // Amount: major units -> integer cents. Missing/invalid leaves 0 for the user to fill.
    let amount = 0;
    if (raw.amountMajor != null && Number.isFinite(raw.amountMajor) && raw.amountMajor > 0) {
      amount = Math.round(raw.amountMajor * 100);
    } else {
      uncertain.add('amount');
    }

    // Category is never guessed: resolve the slug or leave it unresolved.
    let categoryId: number | null = null;
    let unresolvedCategory = true;
    if (raw.categorySlug) {
      const match = categories.find((c) => c.slug === raw.categorySlug);
      if (match) {
        categoryId = match.id;
        unresolvedCategory = false;
      }
    }
    if (unresolvedCategory) uncertain.add('category');

    const description = raw.description?.trim() ? raw.description.trim() : undefined;

    const draft: DraftLedgerEntry = { type, amount, currency, categoryId, description, date };
    return { draft, uncertainFields: [...uncertain], unresolvedCategory };
  }
}
