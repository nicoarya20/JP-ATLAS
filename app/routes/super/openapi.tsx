/**
 * /dev/openapi — reads the OpenAPI spec that GET /api/openapi.json already
 * serves. It generates nothing and changes no spec.
 *
 * This is our own viewer built from Mantine, NOT Swagger UI. The official
 * package is 7.4 MB unpacked with 34 transitive dependencies, ships CSS that
 * fights the JP Atlas theme, and would ride along in the compiled binary — too
 * much for one super-admin page (CLAUDE.md §10). Decided 26 Oct 2026.
 *
 * Two deliberate omissions:
 *
 * 1. No "Try it out". Swagger's version fires real requests from the browser
 *    against the live server with the key you pasted, and a mis-aimed click
 *    would be an actual write. PM_KEY_DENY already refuses the destructive
 *    routes to any key, but it is not a complete guard: plenty of non-denied
 *    writes (create a task, change a setting) would still go through, and "the
 *    deny-list happens to cover the worst of it" is not a safety argument. An
 *    operator who wants to call an endpoint gets a curl line to read first.
 *
 * 2. No session-authenticated path to the spec. The page fetches
 *    /api/openapi.json with the key the operator types, so it sees exactly the
 *    per-key filtered spec (specForKey) that a real API client would get.
 *    Being super-admin does not reveal more here, and the key is never
 *    persisted or logged (app/lib/openapi-client.ts).
 */
import { Alert, Button, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { requireRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { useMemo, useState } from 'react';
import { FiAlertCircle, FiBookOpen, FiSearch } from 'react-icons/fi';
import { OperationList } from '~/components/openapi/OperationList';
import { SpecKeyForm } from '~/components/openapi/SpecKeyForm';
import { SpecSummary } from '~/components/openapi/SpecSummary';
import { fetchSpec, SpecFetchError } from '~/lib/openapi-client';
import type { OpenApiSpec } from '~/lib/openapi-types';
import {
  filterOperations,
  groupOperations,
  listOperations,
  serverUrl,
  usedScopes,
} from '~/lib/openapi-view';
import type { Route } from './+types/openapi';

export function meta() {
  return [{ title: 'Spec OpenAPI — Simple PM Dev' }];
}

/**
 * The loader guards the page and returns nothing else: React Router runs layout
 * and page loaders in parallel, so the layout's guard alone would not cover
 * this one. No spec is sent from here — it only ever arrives through the API
 * key the operator supplies in the browser.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, ROLES.SUPER_ADMIN);
  return null;
}

export default function OpenApiPage() {
  const [keyInput, setKeyInput] = useState('');
  // The spec lives in component state only; unmounting the page drops it with the key.
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [openTags, setOpenTags] = useState<string[]>([]);

  const operations = useMemo(() => listOperations(spec), [spec]);
  const groups = useMemo(
    () => groupOperations(filterOperations(operations, search)),
    [operations, search],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const loaded = await fetchSpec(keyInput);
      setSpec(loaded);
      // Open every group the first time: a filtered spec is usually small.
      setOpenTags(groupOperations(listOperations(loaded)).map((g) => g.tag));
    } catch (e) {
      setSpec(null);
      setError(
        e instanceof SpecFetchError
          ? e.message
          : 'Gagal memuat spec. Periksa koneksi lalu coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }

  function forget() {
    setKeyInput('');
    setSpec(null);
    setError(null);
    setSearch('');
    setOpenTags([]);
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={4} miw={0}>
          <Title order={1}>Spec OpenAPI</Title>
          <Text size="sm" c="dimmed">
            Penampil spec buatan sendiri (bukan Swagger UI) di atas{' '}
            <code>GET /api/openapi.json</code>. Read-only: halaman ini tidak pernah memanggil
            endpoint yang ditampilkan.
          </Text>
        </Stack>
      </Group>

      <Paper withBorder radius="md" p="md">
        <SpecKeyForm
          value={keyInput}
          onChange={setKeyInput}
          onSubmit={load}
          onForget={forget}
          loading={loading}
          loaded={spec !== null}
        />
      </Paper>

      {error && (
        <Alert color="red" variant="light" icon={<FiAlertCircle size="1.25em" />} title="Gagal">
          {error}
        </Alert>
      )}

      {!spec && !error && (
        <Paper withBorder radius="md" p="xl">
          <Stack align="center" gap="xs" ta="center">
            <FiBookOpen size="2em" />
            <Text fw={600}>Belum ada spec yang dimuat</Text>
            <Text size="sm" c="dimmed" maw={460}>
              Masukkan API key di atas. Spec dibuka per kunci, jadi yang tampil adalah permukaan API
              yang benar-benar bisa dipakai kunci itu — bukan daftar lengkap.
            </Text>
            <Button component="a" href="/dev/api-keys" variant="light" size="sm">
              Kelola API key
            </Button>
          </Stack>
        </Paper>
      )}

      {spec && (
        <>
          <SpecSummary
            spec={spec}
            operationCount={operations.length}
            scopes={usedScopes(operations)}
            baseUrl={serverUrl(spec)}
          />
          <TextInput
            placeholder="Cari path, metode, atau scope"
            leftSection={<FiSearch size="1.25em" />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          {groups.length === 0 ? (
            <Paper withBorder radius="md" p="xl">
              <Text ta="center" c="dimmed">
                Tidak ada operasi yang cocok dengan “{search}”.
              </Text>
            </Paper>
          ) : (
            <OperationList
              groups={groups}
              components={spec.components?.schemas}
              baseUrl={serverUrl(spec)}
              openTags={openTags}
              onOpenTagsChange={setOpenTags}
            />
          )}
        </>
      )}
    </Stack>
  );
}
