/** Plain user text with line breaks kept; only http(s) addresses become links (never HTML). */
import { Anchor, Text } from '@mantine/core';
import { Fragment } from 'react';
import { WRAP_PRE_ANYWHERE } from '~/components/pm/text-wrap';
import { splitLinks } from './task-timeline';

export function TimelineText({ text }: { text: string }) {
  return (
    <Text style={WRAP_PRE_ANYWHERE}>
      {splitLinks(text).map((part) =>
        part.kind === 'link' ? (
          // The text is the address itself; rel blocks window.opener and referrer leaks.
          <Anchor key={part.at} href={part.value} target="_blank" rel="noopener noreferrer">
            {part.value}
          </Anchor>
        ) : (
          <Fragment key={part.at}>{part.value}</Fragment>
        ),
      )}
    </Text>
  );
}
