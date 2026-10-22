/** Plain user text with line breaks kept; only http(s) addresses become links (never HTML). */
import { Anchor, Text } from '@mantine/core';
import { splitLinks } from './task-timeline';

export function TimelineText({ text }: { text: string }) {
  return (
    <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {splitLinks(text).map((part) =>
        part.kind === 'link' ? (
          // The text is the address itself; rel blocks window.opener and referrer leaks.
          <Anchor key={part.at} href={part.value} target="_blank" rel="noopener noreferrer">
            {part.value}
          </Anchor>
        ) : (
          <span key={part.at}>{part.value}</span>
        ),
      )}
    </Text>
  );
}
