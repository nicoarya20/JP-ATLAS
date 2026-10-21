// Projects ①: whose projects the list shows — My projects, or one teammate's (avatar + first name in a chip). One pick at a
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

/** One pill: a small avatar (decorative, the label names it) and the label; active = the current pick. */
function PersonChip({ name, label, active, onClick }) {
  return (
    <SuggestionChip size="sm" variant="secondary" className="pj-who" active={active} aria-pressed={active} onClick={onClick}
      icon={<span aria-hidden="true"><Avatar name={name} size="sm" /></span>}>{label}</SuggestionChip>
  );
}

/** Row under the search: the My projects chip (mine = show it, with my own avatar), then one chip per teammate of list,
 *  all the same pill. onPick(who) gets the new pick, or undefined when the picked one is tapped again. */
export function PeopleRow({ list, who, mine, onPick }) {
  const toggle = w => onPick(who === w ? undefined : w);
  return (
    <div className="hscroll chips" role="group" aria-label="Show projects of">
      {mine && <PersonChip name={D.me().name} label="My projects" active={who === 'me'} onClick={() => toggle('me')} />}
      {teammates(list).map(n => <PersonChip key={n} name={n} label={n} active={who === n} onClick={() => toggle(n)} />)}
    </div>
  );
}
