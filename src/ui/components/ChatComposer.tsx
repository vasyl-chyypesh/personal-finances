import { useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { SendIcon } from './icons.tsx';

export interface ChatComposerProps {
  disabled?: boolean;
  onSend: (text: string) => void;
}

export function ChatComposer({ disabled = false, onSend }: ChatComposerProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t-hairline border-line bg-surface px-4 py-3"
    >
      <textarea
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter inserts a newline.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t('chat.placeholder')}
        aria-label={t('chat.placeholder')}
        className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-md border-hairline border-line bg-surface px-3 py-2 text-base text-fg transition-colors duration-100 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label={t('chat.send')}
        title={t('chat.send')}
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-white transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <SendIcon size={22} />
      </button>
    </form>
  );
}
