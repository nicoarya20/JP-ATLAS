/** "Pakai template" end to end (plan §5): pick an existing one and use it, or build a new one manually. */
import type { IsoDate } from '@server/metrics/types';
import { useState } from 'react';
import type { TemplateListItem } from '~/lib/project-templates-api';
import { TemplateForm } from './TemplateForm';
import { TemplatePicker } from './TemplatePicker';
import { TemplateUseForm } from './TemplateUseForm';
import { useProjectTemplates } from './useProjectTemplates';

type Person = { id: string; name: string };
type Props = {
  creator: Person;
  today: IsoDate;
  onSaved: (projectId: string) => void;
};

type View = { kind: 'picker' } | { kind: 'use'; template: TemplateListItem } | { kind: 'create' };

export function TemplateCreateStep({ creator, today, onSaved }: Props) {
  const [view, setView] = useState<View>({ kind: 'picker' });
  const templates = useProjectTemplates();

  if (view.kind === 'use') {
    return (
      <TemplateUseForm
        template={view.template}
        today={today}
        creator={creator}
        submitting={templates.use.loading}
        onCancel={() => setView({ kind: 'picker' })}
        onSubmit={async (input) => {
          const res = await templates.use.run({ id: view.template.id, input });
          if (res.ok) onSaved(res.data.id);
        }}
      />
    );
  }

  if (view.kind === 'create') {
    return (
      <TemplateForm
        saving={templates.create.loading}
        onCancel={() => setView({ kind: 'picker' })}
        onSubmit={async (input) => {
          const res = await templates.create.run(input);
          if (res.ok) setView({ kind: 'picker' });
        }}
      />
    );
  }

  return (
    <TemplatePicker
      onPick={(template) => setView({ kind: 'use', template })}
      onCreateNew={() => setView({ kind: 'create' })}
    />
  );
}
