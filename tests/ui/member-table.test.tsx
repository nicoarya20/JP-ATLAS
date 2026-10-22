import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ProjectMemberItem } from '@server/project/project.dto';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemberTable } from '../../app/components/projects/MemberTable';
import { countManagers, memberActions } from '../../app/components/projects/member-actions';
import { MEMBER_BLOCK_COPY, MEMBERS_COPY } from '../../app/components/projects/members.copy';
import { LABEL_LEAD } from '../../app/components/projects/projects.copy';

// test-only fixtures
const member = (over: Partial<ProjectMemberItem> = {}): ProjectMemberItem => ({
  userId: 'u-1',
  name: 'Rina',
  image: null,
  jobTitle: 'Arsitek',
  role: 'member',
  isLead: false,
  joinedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});
const rina = member({ userId: 'u-rina', name: 'Rina', role: 'manager', isLead: true });
const dodi = member({ userId: 'u-dodi', name: 'Dodi', role: 'member' });
const sri = member({ userId: 'u-sri', name: 'Sri', role: 'viewer', jobTitle: null });
const nico = member({ userId: 'u-nico', name: 'Nico', role: 'manager' });

const noop = () => {};
const render = (members: ProjectMemberItem[], canManage = true, meId = 'u-other') =>
  renderToStaticMarkup(
    <MantineProvider>
      <MemberTable
        members={members}
        canManage={canManage}
        meId={meId}
        onChangeRole={noop}
        onRemove={noop}
      />
    </MantineProvider>,
  );

/** Every `<button>` tag whose aria-label is `label`. */
const buttons = (html: string, label: string) =>
  html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`, 'g')) ?? [];
const isDisabled = (tag: string) => / disabled=""/.test(tag);
/** The markup of the card list that only shows below `sm`. */
const cardList = (html: string) => {
  const start = html.indexOf('role="list"');
  expect(start).toBeGreaterThan(-1);
  return html.slice(start);
};

describe('memberActions', () => {
  const ctx = { canManage: true, meId: 'u-other', managerCount: 1 };

  it('hides every action when the caller may not manage members', () => {
    expect(memberActions(dodi, { ...ctx, canManage: false })).toEqual({
      changeRole: null,
      remove: null,
    });
  });

  it('blocks the last manager with the written reason', () => {
    const lone = member({ role: 'manager' });
    expect(memberActions(lone, ctx)).toEqual({
      changeRole: { blocked: MEMBER_BLOCK_COPY.lastManager },
      remove: { blocked: MEMBER_BLOCK_COPY.lastManager },
    });
  });

  it('blocks the Lead even when another manager exists', () => {
    expect(memberActions(rina, { ...ctx, managerCount: 2 }).remove).toEqual({
      blocked: MEMBER_BLOCK_COPY.isLead,
    });
  });

  it('lets a manager step down when another manager exists, but never remove themself', () => {
    const actions = memberActions(nico, { ...ctx, managerCount: 2, meId: 'u-nico' });
    expect(actions.changeRole).toEqual({ blocked: null });
    expect(actions.remove).toEqual({ blocked: MEMBER_BLOCK_COPY.self });
  });

  it('leaves plain members and watchers free to change', () => {
    expect(memberActions(sri, ctx)).toEqual({
      changeRole: { blocked: null },
      remove: { blocked: null },
    });
  });

  it('counts managers only', () => {
    expect(countManagers([rina, dodi, sri, nico])).toBe(2);
  });
});

describe('MemberTable', () => {
  it('disables the last manager’s buttons and writes the reason in text', () => {
    const html = render([member({ userId: 'u-x', name: 'Rina', role: 'manager' }), dodi]);
    const roleButtons = buttons(html, MEMBERS_COPY.changeRoleOf('Rina'));
    const removeButtons = buttons(html, MEMBERS_COPY.removeOf('Rina'));
    expect(roleButtons.length).toBe(2); // table + card
    expect([...roleButtons, ...removeButtons].every(isDisabled)).toBe(true);
    expect(html).toContain(
      'Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu.',
    );
    expect(buttons(html, MEMBERS_COPY.removeOf('Dodi')).some(isDisabled)).toBe(false);
  });

  it('marks the Lead and blocks removing them with a reason', () => {
    const html = render([rina, nico, dodi]);
    expect(html).toContain(LABEL_LEAD);
    expect(buttons(html, MEMBERS_COPY.removeOf('Rina')).every(isDisabled)).toBe(true);
    expect(html).toContain(MEMBER_BLOCK_COPY.isLead);
    expect(buttons(html, MEMBERS_COPY.removeOf('Nico')).some(isDisabled)).toBe(false);
  });

  it('explains what a Pemantau may do', () => {
    expect(render([rina, sri])).toContain('Hanya melihat dan berkomentar');
  });

  it('renders a card list below sm that carries the actions', () => {
    const html = render([rina, nico, dodi]);
    expect(html).toMatch(
      /mantine-hidden-from-sm[^>]*role="list"|role="list"[^>]*mantine-hidden-from-sm/,
    );
    const cards = cardList(html);
    expect(cards.match(/role="listitem"/g)?.length).toBe(3);
    expect(buttons(cards, MEMBERS_COPY.removeOf('Dodi')).length).toBe(1);
    expect(buttons(cards, MEMBERS_COPY.changeRoleOf('Dodi')).length).toBe(1);
  });

  it('hides the action column and buttons without permission', () => {
    const html = render([rina, nico, dodi, sri], false);
    expect(html).not.toContain(`>${MEMBERS_COPY.colActions}<`);
    expect(html).not.toContain(MEMBERS_COPY.remove);
    expect(html).not.toContain(MEMBERS_COPY.changeRole);
    expect(html).not.toContain(MEMBER_BLOCK_COPY.lastManager);
    expect(html).toContain('Dodi');
  });

  it('marks the signed-in person and blocks removing themself', () => {
    const html = render([rina, nico, dodi], true, 'u-nico');
    expect(html).toContain(`Nico ${MEMBERS_COPY.you}`);
    expect(buttons(html, MEMBERS_COPY.removeOf('Nico')).every(isDisabled)).toBe(true);
    expect(html).toContain(MEMBER_BLOCK_COPY.self);
  });

  it('shows an empty state instead of an empty table', () => {
    const html = render([]);
    expect(html).toContain(MEMBERS_COPY.emptyTitle);
    expect(html).not.toContain('<table');
  });
});
