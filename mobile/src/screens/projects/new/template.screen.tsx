// Projects ⑦ Use template (prototype projects.create.jsx ProjectsTemplate): pick one of the saved structures, name the
// project and its start date; the estimated end follows from the template's length. Create project saves nothing in
// Phase 1, like the prototype, and says why it is off (no name once touched, no template).
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { getProjectCreate, templateDates } from '@/data/projects';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Info, Note, Sec } from '../parts/display';
import { Foot, Labelled } from '../parts/form-bits';
import { CREATE, TEMPLATE } from '../projects.strings';
import { WHY } from '../projects.strings.added';
import { createProject } from './create-done';

type Template = ReturnType<typeof getProjectCreate>['templates'][number];

/** A template row: name, its size and where it came from. RadioList takes labels only, so the rows are drawn here. */
function TemplateRow({ t, on, onPick }: { t: Template; on: boolean; onPick: () => void }) {
  return (
    <Pressable
      testID={`template-${t.id}`}
      accessibilityRole="radio"
      accessibilityLabel={t.name}
      accessibilityHint={t.meta}
      accessibilityState={{ checked: on }}
      onPress={onPick}
      className={`min-h-11 gap-1 rounded-card border p-3 ${on ? 'border-2 border-atlas' : 'border-border'}`}
    >
      <Text className="text-headline font-semibold text-foreground">{t.name}</Text>
      <Text className="text-subhead text-muted-foreground">{t.meta}</Text>
      <Note>{t.from}</Note>
    </Pressable>
  );
}

/** The template step, for a Manager or Admin; a Member goes home. */
export function ProjectTemplateScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const notice = useNotice();
  const [c] = useState(() => getProjectCreate(role));
  const [pick, setPick] = useState(c.templates[0]?.id ?? '');
  const [name, setName] = useState(c.template.name);
  const [start, setStart] = useState(c.template.start);
  const [touched, setTouched] = useState(false);
  if (!allowedScreen('projects.template', role)) return <Redirect href="/" />;
  const t = c.templates.find((x) => x.id === pick);
  const noName = name.trim() ? undefined : WHY.name;
  const why = !t ? WHY.template : noName;
  return (
    <DetailPage
      testID="project-template"
      title={TEMPLATE.title}
      foot={
        <Foot label={CREATE.create} ok={!why} why={why} onPress={() => createProject(notice)} />
      }
    >
      <Sec title={TEMPLATE.choose}>
        <View accessibilityRole="radiogroup" aria-label={TEMPLATE.choose} className="gap-2">
          {c.templates.map((x) => (
            <TemplateRow key={x.id} t={x} on={x.id === pick} onPick={() => setPick(x.id)} />
          ))}
        </View>
      </Sec>
      <Sec title={TEMPLATE.fill}>
        <Field
          label={TEMPLATE.name}
          required
          value={name}
          onChangeText={(v) => {
            setTouched(true);
            setName(v);
          }}
          onBlur={() => setTouched(true)}
          error={touched ? noName : undefined}
          testID="template-name"
        />
        <Labelled label={TEMPLATE.start} required>
          <DateField
            label={fieldName(TEMPLATE.start, true)}
            value={start}
            initial={start}
            onChange={setStart}
            testID="template-start"
          />
        </Labelled>
        {t && (
          <Info
            testID="template-end"
            label={TEMPLATE.end}
            value={templateDates(start, t.days).end}
          />
        )}
      </Sec>
      <Note>{TEMPLATE.note}</Note>
    </DetailPage>
  );
}
