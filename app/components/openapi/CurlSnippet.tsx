/**
 * The curl line for one operation, with a copy button. The command carries the
 * `$SP_API_KEY` placeholder, never the key typed into the page — see
 * app/lib/openapi-curl.ts for why.
 */
import { ActionIcon, Code, CopyButton, Group, Stack, Text, Tooltip } from '@mantine/core';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { KEY_PLACEHOLDER } from '~/lib/openapi-curl';

export function CurlSnippet({ command }: { command: string }) {
  return (
    <Stack gap={4}>
      <Group gap="xs" justify="space-between" wrap="nowrap" align="flex-start">
        <Text size="xs" fw={600} c="dimmed">
          Panggil dari terminal
        </Text>
        <CopyButton value={command} timeout={1500}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Tersalin' : 'Salin perintah'} withArrow>
              <ActionIcon
                variant="subtle"
                color={copied ? 'teal' : 'gray'}
                size="sm"
                onClick={copy}
                aria-label="Salin perintah curl"
                flex="0 0 auto"
              >
                {copied ? <FiCheck size="1.25em" /> : <FiCopy size="1.25em" />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
      <Code
        block
        fz="xs"
        style={{
          // No Mantine prop for `whiteSpace` or `wordBreak`: the snippet keeps its line breaks and still
          // wraps a long unbroken token.
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {command}
      </Code>
      <Text size="xs" c="dimmed">
        Isi <Code>{KEY_PLACEHOLDER}</Code> di shell kamu — perintah ini sengaja tidak memuat kunci
        aslinya.
      </Text>
    </Stack>
  );
}
