// Profile note: the thought bubble next to the photo (Discord "+ Latest hobby?", WhatsApp/Instagram notes).
// Tap to type; Enter or leaving the field saves, Escape cancels, an empty note clears it.
import { useRef, useState } from 'react';
import { NOTE_MAX, setProfile, useProfile } from './profile.store';

export default function ProfileNote() {
  const { note } = useProfile();
  const [draft, setDraft] = useState(null);   // null = showing the bubble, string = editing
  const done = useRef(false);            // set once Enter/Escape ended the edit: the blur that follows is ignored

  const edit = () => { done.current = false; setDraft(note); };
  const save = () => {
    if (done.current) return;
    done.current = true;
    setProfile({ note: draft.trim() });
    setDraft(null);
  };
  const onKeyDown = e => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { done.current = true; setDraft(null); }
  };

  return (
    <div className="pf-note">
      {draft === null ? (
        <button type="button" className={`pf-bubble${note ? '' : ' is-empty'}`} onClick={edit}
          aria-label={note ? `Note: ${note}. Edit note` : 'Add a note'}>
          {note || '+ Add a note'}
        </button>
      ) : (
        // data-own-escape: Escape cancels the edit instead of closing the overlay
        <input className="pf-bubble pf-input" data-own-escape="" autoFocus value={draft} maxLength={NOTE_MAX}
          placeholder="What's on your mind?" aria-label="Note" onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown} onBlur={save} />
      )}
      <span className="pf-tail" aria-hidden="true"><i /><i /></span>
    </div>
  );
}
