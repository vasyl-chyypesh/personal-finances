import { useCallback, useEffect, useState } from 'react';
import { ApiError, createLedger, extractChat, getChatStatus } from '../lib/client.ts';
import type { ChatExtractResult, ChatStatus, CreateLedgerEntryDto, LedgerEntry } from '../types.ts';

/** One turn in the (ephemeral, in-session) conversation. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** User text, or assistant info/error text. */
  text?: string;
  /** Assistant draft extracted from the user's message. */
  result?: ChatExtractResult;
  /** The ledger entry once the draft is confirmed and saved. */
  saved?: LedgerEntry;
  /** Marks an assistant message as an error (failed extraction). */
  error?: boolean;
}

export interface UseChatResult {
  status: ChatStatus | null;
  statusLoading: boolean;
  messages: ChatMessage[];
  sending: boolean;
  send: (text: string) => Promise<void>;
  confirmDraft: (messageId: string, dto: CreateLedgerEntryDto) => Promise<void>;
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Drives the AI chat: feature status, the ephemeral message list, sending a
 * message for extraction, and confirming a draft into a real ledger entry.
 * History lives only in memory — a reload clears it (created entries persist).
 */
export function useChat(): UseChatResult {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    getChatStatus()
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        if (active) setStatus({ available: false, ready: false });
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { id: newId(), role: 'user', text: trimmed }]);
    setSending(true);
    try {
      const result = await extractChat(trimmed);
      // The model is downloaded on first use, so it's certainly ready afterwards.
      setStatus((s) => (s ? { ...s, ready: true } : s));
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', result }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'assistant', text: toMessage(err, 'Extraction failed'), error: true },
      ]);
    } finally {
      setSending(false);
    }
  }, []);

  const confirmDraft = useCallback(async (messageId: string, dto: CreateLedgerEntryDto) => {
    const entry = await createLedger(dto);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, saved: entry } : m)));
  }, []);

  return { status, statusLoading, messages, sending, send, confirmDraft };
}
