// Tasks ⑧b Edit task: editors for the task's lists — tags, step checklist and evidence. Each is controlled by the form.
import { useState } from 'react';
import { Checkbox } from '@react-cupertino-ui/checkbox';
import { X } from 'lucide-react';
import { Link, Media } from '../../kit';
import { Sec } from './tasks.parts';

const without = (list, i) => list.filter((_, j) => j !== i);
const swap = (list, i, item) => list.map((x, j) => (j === i ? item : x));

function Remove({ label, onClick }) {
  return <button type="button" className="tk-x" aria-label={label} onClick={onClick}><X size={16} aria-hidden="true" /></button>;
}

/** Tags as removable chips; Enter in the box adds the typed tag (lowercase, no duplicates). */
export function TagsEdit({ tags, onChange }) {
  const [text, setText] = useState('');
  const add = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const tag = text.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setText('');
  };
  return (
    <div className="field">
      <span className="t-footnote muted">Tag</span>
      <span className="tk-tagbox">
        {tags.map((t, i) => (
          <span key={t} className="tk-tag t-footnote">{t}<Remove label={`Remove tag ${t}`} onClick={() => onChange(without(tags, i))} /></span>
        ))}
        <input value={text} placeholder="Type a tag, then Enter…" aria-label="Add tag" onChange={e => setText(e.target.value)} onKeyDown={add} />
      </span>
    </div>
  );
}

/** Step checklist: tick, rename and remove steps; + Add step appends an empty one. steps = [[text, done]]. */
export function StepsEdit({ steps, onChange }) {
  return (
    <Sec title="Steps">
      {steps.map(([text, done], i) => (
        <div key={i} className="tk-edit-row">
          <Checkbox size="sm" variant="solid" checked={done} aria-label={`Step ${i + 1} done`}
            onChange={e => onChange(swap(steps, i, [text, e.target.checked]))} />
          <input className="tk-edit-input" value={text} placeholder="Describe the step…" aria-label={`Step ${i + 1}`}
            onChange={e => onChange(swap(steps, i, [e.target.value, done]))} />
          <Remove label={`Remove step ${i + 1}`} onClick={() => onChange(without(steps, i))} />
        </div>
      ))}
      <div><Link onClick={() => onChange([...steps, ['', false]])}>+ Add step</Link></div>
    </Sec>
  );
}

/** Evidence: edit each caption or remove it; + Attach evidence stands in for picking a photo. proof = [[file, caption]]. */
export function EvidenceEdit({ proof, onChange }) {
  const attach = () => {
    let n = proof.length + 1;
    while (proof.some(p => p[0] === `photo-${n}.jpg`)) n += 1;
    onChange([...proof, [`photo-${n}.jpg`, '']]);
  };
  return (
    <Sec title="Evidence">
      {proof.map(([file, caption], i) => (
        <div key={file} className="tk-edit-row">
          <Media label="Photo" size="sm" />
          <div className="stack xs grow">
            <span className="t-footnote bold">{file}</span>
            <input className="tk-edit-input" value={caption} placeholder="Add a caption…" aria-label={`Caption for ${file}`}
              onChange={e => onChange(swap(proof, i, [file, e.target.value]))} />
          </div>
          <Remove label={`Remove ${file}`} onClick={() => onChange(without(proof, i))} />
        </div>
      ))}
      <div><Link onClick={attach}>+ Attach evidence</Link></div>
    </Sec>
  );
}
