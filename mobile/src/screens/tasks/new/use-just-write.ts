// The state of Just write ✦: the story, the drafts of the last Compose with the server's question, and the two
// requests (UX §2/§3). Compose asks POST /tasks/draft; without AI (503/502) it falls back to Fill form with the story
// as the title and the server's notice. Save adds the kept drafts one by one and stops at the first refusal, saying
// how many went in and dropping those from the list, so trying again cannot add them twice.
import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import {
  answerQuestion,
  type DraftRow,
  draftBody,
  draftRows,
  draftTasks,
  fallsBackToForm,
  type TaskDraftQuestionWire,
  titleFromStory,
} from '@/data/tasks.draft';
import { type CreatedTasks, createTasks } from '@/data/tasks.form.write';

import { why } from '../detail/use-detail-run';
import { W } from '../tasks.strings.more';

type Drafts = { rows: DraftRow[]; question: TaskDraftQuestionWire | null; answer: string | null };

/** Just write ✦ in project `projectId`; `reset` forgets the drafts (another project has other people and kinds). */
export function useJustWrite(projectId: string) {
  const notice = useNotice();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [busy, setBusy] = useState<'compose' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const round = useRef(0);

  const compose = async () => {
    if (busy) return;
    setBusy('compose');
    setError(null);
    try {
      const r = await draftTasks(projectId, text);
      round.current += 1;
      setDrafts({ rows: draftRows(r, round.current), question: r.question, answer: null });
    } catch (e) {
      if (fallsBackToForm(e)) {
        notice(e.message);
        router.replace({
          pathname: '/tasks/new/form',
          params: { project: projectId, title: titleFromStory(text) },
        });
      } else setError(why(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const kept = drafts?.rows.filter((r) => r.keep) ?? [];
    if (busy || !kept.length) return;
    setBusy('save');
    setError(null);
    let r: CreatedTasks;
    try {
      r = await createTasks(
        projectId,
        kept.map((d) => draftBody(projectId, d)),
      );
    } catch (e) {
      setBusy(null);
      setError(why(e));
      return;
    }
    setBusy(null);
    if (!r.error) {
      notice(W.saved(r.saved));
      router.dismiss();
      return;
    }
    const gone = new Set(kept.slice(0, r.saved).map((d) => d.key));
    setDrafts((d) => d && { ...d, rows: d.rows.filter((x) => !gone.has(x.key)) });
    setError(r.saved ? W.partly(r.saved, kept.length, r.error.message) : r.error.message);
  };

  /** Changes draft `key`. */
  const edit = (key: string, change: Partial<DraftRow>) =>
    setDrafts(
      (d) => d && { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...change } : r)) },
    );

  /** "Which member?" answered with `memberId`. */
  const answer = (memberId: string) =>
    setDrafts((d) =>
      d?.question
        ? { ...d, rows: answerQuestion(d.rows, d.question, memberId), answer: memberId }
        : d,
    );

  const reset = () => {
    setDrafts(null);
    setError(null);
  };

  return { text, setText, drafts, busy, error, compose, save, edit, answer, reset };
}
