import { Button } from '@mantine/core';
import type { MouseEvent } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router';

type Props = {
  /** Where to go when the page was opened directly (no in-app history), e.g. the project list. */
  fallback: string;
  /** Names the destination: "Kembali ke daftar tugas". */
  label: string;
};

/** True when React Router's own history entry index shows an earlier in-app page to go back to. */
export function hasInternalHistory(state: unknown): boolean {
  const idx = (state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

/** Goes back to where the user came from (keeping filters and scroll), or to `fallback` on a direct visit. */
export function BackLink({ fallback, label }: Props) {
  const navigate = useNavigate();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let new-tab clicks through; the decision is made at click time so SSR and hydration markup match.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!hasInternalHistory(window.history.state)) return;
    e.preventDefault();
    navigate(-1);
  };
  return (
    <Button
      component={Link}
      to={fallback}
      onClick={onClick}
      variant="subtle"
      size="sm"
      px="xs"
      leftSection={<FiArrowLeft size="1.25em" aria-hidden />}
    >
      {label}
    </Button>
  );
}
