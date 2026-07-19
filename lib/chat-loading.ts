import type { ChatStatus, UIMessage } from 'ai';

/**
 * Whether the chat UI should show a "thinking / checking" shimmer.
 * True while the request is submitted, and while streaming until the latest
 * assistant message has any text or reasoning content.
 */
export function shouldShowLoadingShimmer(status: ChatStatus, messages: UIMessage[]): boolean {
  if (status === 'submitted') return true;

  if (status === 'streaming') {
    const lastAssistant = messages.findLast(message => message.role === 'assistant');
    if (!lastAssistant) return true;

    const hasContent = lastAssistant.parts.some(
      part => (part.type === 'text' || part.type === 'reasoning') && part.text.length > 0,
    );

    return !hasContent;
  }

  return false;
}
