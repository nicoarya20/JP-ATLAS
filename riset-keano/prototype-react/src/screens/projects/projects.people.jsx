// Projects ①: whose projects the list shows — My projects, or one teammate's (avatar over first name). One pick at a
// time; tapping the picked one again shows every project. The pick lives in the list's params.who ('me' or a first
// name), so Back from a project keeps it.
import { SuggestionChip } from '@react-cupertino-ui/suggestion-chip';
import { Avatar } from '../../kit';
import { D } from '../../data/sample';

/** Projects in list that params.who belongs to (as member or Lead): 'me' = the signed-in person, else a first name. */
export function ofWho(list, who) {
  const name = who === 'me' ? D.me().name : who;
  return name ? list.filter(p => p.members.includes(name)) : list;
}

/** Teammates in any project of list except me, in D.people order. */
export const teammates = list => Object.values(D.people).map(p => p.name)
  .filter(n => n !== D.me().name && list.some(p => p.members.includes(n)));

/** Row under the search: the My projects chip (mine = show it), then one avatar per teammate of list.
 *  onPick(who) gets the new pick, or undefined when the picked one is tapped again. */
export function PeopleRow({ list, who, mine, onPick }) {
  const toggle = w => onPick(who === w ? undefined : w);
  return (
    <div className="hscroll pj-people" role="group" aria-label="Show projects of">
      {mine && <SuggestionChip size="sm" variant="secondary" active={who === 'me'} aria-pressed={who === 'me'}
        onClick={() => toggle('me')}>My projects</SuggestionChip>}
      {teammates(list).map(n => (
        <button key={n} type="button" className="pj-person" aria-pressed={who === n} onClick={() => toggle(n)}>
          <span aria-hidden="true"><Avatar name={n} size="sm" /></span><span className="t-caption">{n}</span>
        </button>
      ))}
    </div>
  );
}
