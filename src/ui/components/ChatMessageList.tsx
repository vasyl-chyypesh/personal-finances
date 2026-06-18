import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { DraftEntryCard } from './DraftEntryCard.tsx';
import { SpinnerIcon } from './icons.tsx';
import type { ChatMessage } from '../hooks/useChat.ts';
import type { Category, CreateLedgerEntryDto } from '../types.ts';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  categories: Category[];
  sending: boolean;
  onConfirm: (messageId: string, dto: CreateLedgerEntryDto) => Promise<void>;
}

export function ChatMessageList({
  messages,
  categories,
  sending,
  onConfirm,
}: ChatMessageListProps) {
  const { t } = useI18n();
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <p className="max-w-sm text-sm text-fg-muted">{t('chat.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
      {messages.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">
              {m.text}
            </p>
          </div>
        ) : (
          <div key={m.id} className="flex justify-start">
            <div className="w-full max-w-[90%]">
              {m.result ? (
                <DraftEntryCard
                  result={m.result}
                  categories={categories}
                  saved={m.saved}
                  onConfirm={(dto) => onConfirm(m.id, dto)}
                />
              ) : (
                <p
                  className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2 text-sm ${
                    m.error ? 'bg-expense-bg text-expense-text' : 'bg-surface-muted text-fg'
                  }`}
                >
                  {m.text}
                </p>
              )}
            </div>
          </div>
        ),
      )}

      {sending ? (
        <div className="flex justify-start">
          <p className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-2 text-sm text-fg-muted">
            <SpinnerIcon size={16} className="animate-spin" />
            {t('chat.thinking')}
          </p>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
