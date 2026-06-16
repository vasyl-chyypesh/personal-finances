import { useI18n } from '../i18n/i18nContext.ts';
import { useChat } from '../hooks/useChat.ts';
import { useCategories } from '../hooks/useCategories.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { ChatMessageList } from '../components/ChatMessageList.tsx';
import { ChatComposer } from '../components/ChatComposer.tsx';

export function ChatPage() {
  const { t } = useI18n();
  const { status, statusLoading, messages, sending, send, confirmDraft } = useChat();
  const { categories } = useCategories();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('chat.title')} subtitle={t('chat.subtitle')} />

      {statusLoading ? (
        <p className="text-sm text-fg-muted">{t('chat.loading')}</p>
      ) : !status?.available ? (
        <div className="rounded-lg border-hairline border-line bg-surface p-6">
          <h2 className="text-md font-medium text-fg">{t('chat.notConfiguredTitle')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('chat.notConfiguredBody')}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-hairline border-line bg-surface">
          {status.ready === false ? (
            <p className="border-b-hairline border-line bg-primary-soft px-4 py-2 text-xs text-primary">
              {t('chat.downloadHint')}
            </p>
          ) : null}
          <ChatMessageList
            messages={messages}
            categories={categories}
            sending={sending}
            onConfirm={confirmDraft}
          />
          <ChatComposer disabled={sending} onSend={(text) => void send(text)} />
        </div>
      )}
    </div>
  );
}
