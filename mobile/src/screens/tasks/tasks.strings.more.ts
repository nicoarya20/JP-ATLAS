// Copy of New task · Just write ✦ (prototype tasks.new.jsx), on the server's drafts (POST /tasks/draft). What the
// server writes (an assignee note, the question, a refusal) is shown as it comes (K5), so it has no entry here.

const tasks = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

export const W = {
  project: 'Project',
  textLabel: 'What needs to be done',
  textHint: 'Who does what, and by when. AI turns it into tasks.',
  /** Characters used of the server's limit. */
  length: (n: number, max: number) => `${n}/${max}`,
  compose: 'Compose ✦',
  composeHint: 'Write what needs to be done first.',
  draftNote: 'Draft from AI. Check before saving.',
  count: tasks,
  draft: (n: number) => `Draft ${n}`,
  keep: (n: number) => `Keep draft ${n}`,
  dropped: 'Not saved. Tick it to keep it.',
  type: (name: string) => `Type: ${name}`,
  noDrafts: 'No tasks yet. Answer below, or write more and compose again.',
  save: (n: number) => `Save ${tasks(n)}`,
  pickOne: 'Keep at least one draft to save.',
  needTitle: 'Every kept draft needs a title.',
  saved: (n: number) => `Saved ${tasks(n)}`,
  partly: (saved: number, total: number, why: string) =>
    `Saved ${saved} of ${tasks(total)}, then stopped: ${why}`,
} as const;
