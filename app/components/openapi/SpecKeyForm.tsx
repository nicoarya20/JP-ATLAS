/**
 * Where the operator pastes the API key whose spec they want to read.
 *
 * The value is lifted into the page's React state and nowhere else: no
 * localStorage, no cookie, no server round trip that stores it. `autoComplete`
 * is off so the browser does not offer to save it either (CLAUDE.md §7).
 */
import { Alert, Button, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { FiEye, FiInfo, FiTrash2 } from 'react-icons/fi';
import { API_KEY_PREFIX } from '~/lib/openapi-client';

export function SpecKeyForm({
  value,
  onChange,
  onSubmit,
  onForget,
  loading,
  loaded,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onForget: () => void;
  loading: boolean;
  loaded: boolean;
}) {
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <PasswordInput
          label="API key"
          description="Spec yang tampil hanya berisi endpoint yang boleh dipanggil kunci ini."
          placeholder={`${API_KEY_PREFIX}…`}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          disabled={loading}
        />
        <Group gap="xs" wrap="wrap">
          <Button type="submit" loading={loading} leftSection={<FiEye size="1.25em" />}>
            Muat spec
          </Button>
          {loaded && (
            <Button
              type="button"
              variant="subtle"
              color="gray"
              onClick={onForget}
              disabled={loading}
              leftSection={<FiTrash2 size="1.25em" />}
            >
              Lupakan key
            </Button>
          )}
        </Group>
        <Alert
          variant="light"
          color="blue"
          icon={<FiInfo size="1.25em" />}
          title="Kunci ini tidak disimpan"
        >
          <Text size="sm">
            Kunci hanya ada di memori tab ini selama halaman terbuka — tidak ditulis ke browser,
            tidak dikirim ke server selain sebagai header <code>X-API-Key</code> ke{' '}
            <code>/api/openapi.json</code>, dan tidak masuk log. Muat ulang halaman atau tekan
            “Lupakan key” dan kunci itu hilang.
          </Text>
        </Alert>
      </Stack>
    </form>
  );
}
