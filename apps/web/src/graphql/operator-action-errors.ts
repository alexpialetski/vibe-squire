import { ApolloError } from '@apollo/client';
import { getErrorMessage } from '../toast';

/** Parses JSON bodies Nest sometimes returns on HTTP-style failures (mirrors dashboard REST parsing). */
function parseJsonActionMessage(text: string): string | null {
  if (!text.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      reason?: string;
      cooldownUntil?: string;
      error?: string;
    };
    if (
      parsed.reason === 'cooldown' &&
      typeof parsed.cooldownUntil === 'string' &&
      parsed.cooldownUntil.length > 0
    ) {
      return `Cooldown active until ${parsed.cooldownUntil}`;
    }
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return parsed.message;
    }
    if (typeof parsed.reason === 'string' && parsed.reason.length > 0) {
      return parsed.reason;
    }
    if (typeof parsed.error === 'string' && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseGraphqlOperatorActionError(error: unknown): string {
  if (error instanceof ApolloError) {
    const first = error.graphQLErrors[0];
    if (first?.message) {
      const fromJson = parseJsonActionMessage(first.message);
      if (fromJson) {
        return fromJson;
      }
      return first.message;
    }
  }
  return getErrorMessage(error);
}
