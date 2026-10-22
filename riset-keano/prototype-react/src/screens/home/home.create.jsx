// Home ③ Sheet · Create: the "+" on Home and on screens whose tab has no own "new" lets the person pick what to add; rows the role can't open are left out.
import { CalendarPlus, FileUp, FolderPlus, ListPlus, Plane } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { allowed } from '../../core/registry';
import { Row, Rows, Sheet } from '../../kit';
import { LEAVE } from '../settings/settings.leave';

const ICON = 18;
const tile = (icon, tone) => <span className={`hm-tile ${tone}`}>{icon}</span>;

/** Everything a person can add: [target id, title, sub, icon tile]. Leave's title follows the role (request vs set). */
const OPTIONS = role => [
  ['tasks.write', 'Task', 'Just write it or fill a form', tile(<ListPlus size={ICON} />, 'blue')],
  ['projects.new', 'Project', 'From a story, a template or a form', tile(<FolderPlus size={ICON} />, 'green')],
  ['events.new', 'Event', 'Meeting, review or team event', tile(<CalendarPlus size={ICON} />, 'orange')],
  ['tasks.csv', 'Import tasks', 'Add many tasks from a CSV file', tile(<FileUp size={ICON} />, 'gray')],
  ['settings.leave', LEAVE[role].title, 'Days you will be away', tile(<Plane size={ICON} />, 'gray')],
];

export default function HomeCreate() {
  const { role } = useApp();
  return (
    <Sheet title="Create" sub="What do you want to add?">
      <Rows>
        {OPTIONS(role).filter(([go]) => allowed(go, role)).map(([go, title, sub, lead]) => (
          <Row key={go} lead={lead} title={title} sub={sub} go={go} />
        ))}
      </Rows>
    </Sheet>
  );
}
