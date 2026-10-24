// Settings groups and rows (prototype settings.main.jsx Group / Setting), and the Admin-only Team settings group.
import type { ReactNode } from 'react';
import { useState } from 'react';

import { SectionLabel } from '@/components/form/section-label';
import { SelectField } from '@/components/form/select-field';
import { SwitchRow } from '@/components/form/switch-row';
import { useNotice } from '@/components/notice/use-notice';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { TEAM_SETTINGS as T } from './settings.strings';

/** Labelled group of setting rows with an optional footnote. */
export function Group({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      <SectionLabel>{label}</SectionLabel>
      <SectionCard>{children}</SectionCard>
      {note && <Text className="text-footnote text-muted-foreground">{note}</Text>}
    </VStack>
  );
}

/** Setting row: bold title and muted hint; the control on the right, or under them when it is wide. */
export function Setting(p: { title: string; hint: string; below?: boolean; children: ReactNode }) {
  const text = (
    <VStack className="min-w-0 flex-1 gap-1">
      <Text className="font-semibold">{p.title}</Text>
      <Text className="text-footnote text-muted-foreground">{p.hint}</Text>
    </VStack>
  );
  if (p.below) {
    return (
      <VStack className="gap-2">
        {text}
        {p.children}
      </VStack>
    );
  }
  return (
    <HStack className="items-center gap-3">
      {text}
      {p.children}
    </HStack>
  );
}

const options = (list: readonly string[]) => list.map((o) => ({ value: o, label: o }));

/** Team settings (Admin only): AI, recording retention, default reminder, leave approval, roles. */
export function TeamSettings() {
  const notice = useNotice();
  const [ai, setAi] = useState(true);
  const [retention, setRetention] = useState<string>(T.retentionOptions[1]);
  const [reminder, setReminder] = useState<string>(T.reminderOptions[2]);
  const [approval, setApproval] = useState(true);
  return (
    <Group label={T.label}>
      <SwitchRow label={T.ai} sub={T.aiHint} value={ai} onChange={setAi} />
      <Setting title={T.retention} hint={T.retentionHint} below>
        <SelectField
          label={T.retention}
          options={options(T.retentionOptions)}
          value={retention}
          onChange={setRetention}
        />
      </Setting>
      <Setting title={T.reminder} hint={T.reminderHint} below>
        <SelectField
          label={T.reminder}
          options={options(T.reminderOptions)}
          value={reminder}
          onChange={setReminder}
        />
      </Setting>
      <SwitchRow
        label={T.leaveApproval}
        sub={T.leaveApprovalHint}
        value={approval}
        onChange={setApproval}
      />
      <Setting title={T.roles} hint={T.rolesHint}>
        <Button size="sm" variant="link" onPress={() => notice(T.rolesNotice)}>
          <ButtonText>{T.rolesView}</ButtonText>
        </Button>
      </Setting>
    </Group>
  );
}
