// Tasks ⑦ Import CSV (prototype tasks.new.jsx TasksCsv): a preview where error rows are skipped, rows with notes still
// import and blanks get defaults. Phase 1 reads no file: the preview is sample data and Import only toasts.
import { router } from 'expo-router';
import { useState } from 'react';

import { Seg } from '@/components/form/seg';
import { useNotice } from '@/components/notice/use-notice';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getCsvImport } from '@/data/tasks';
import type { CsvPreviewRow } from '@/data/tasks.write';
import { TaskPage } from '../parts/task-page';
import { Act, Foot, Soft } from '../parts/task-parts';
import { SPOKEN } from '../tasks.strings.added';
import { C } from '../tasks.strings.more';

/** One preview row as a card (the prototype's five columns would not fit a phone as a table). */
function CsvRowCard({ row, i }: { row: CsvPreviewRow; i: number }) {
  const error = row.state === 'error';
  const body = (
    <VStack className="gap-2">
      <HStack className="items-start justify-between gap-2">
        <HStack className="min-w-0 flex-1 flex-wrap items-baseline gap-2">
          <Text className="text-footnote text-muted-foreground">{C.row(i + 1)}</Text>
          <Text className="min-w-0 flex-shrink text-headline font-semibold text-foreground">
            {row.title}
          </Text>
        </HStack>
        <Text className="text-footnote font-bold text-foreground">{row.label}</Text>
      </HStack>
      <Text className="text-footnote text-foreground">{row.line}</Text>
      {!!row.note && <Text className="text-footnote font-bold text-foreground">{row.note}</Text>}
    </VStack>
  );
  return error ? (
    <Soft strong testID={`csv-row-${i + 1}`}>
      {body}
    </Soft>
  ) : (
    <VStack className="rounded-card bg-card p-4" testID={`csv-row-${i + 1}`}>
      {body}
    </VStack>
  );
}

/** Import CSV into Atlas; Import closes the modal. */
export function CsvScreen() {
  const notice = useNotice();
  const [csv] = useState(getCsvImport);
  const [mode, setMode] = useState(0);
  const run = () => {
    notice(C.imported);
    router.dismiss();
    router.navigate({ pathname: '/tasks', params: { scope: 'all' } });
  };
  const foot = (
    <Foot>
      <Act grow label={C.cancel} onPress={() => router.back()} />
      <Act wide kind="primary" label={csv.importLabel} onPress={run} testID="csv-import" />
    </Foot>
  );
  return (
    <TaskPage modal title={C.title} foot={foot} testID="screen-task-csv">
      <Text accessibilityRole="header" className="text-section font-semibold text-foreground">
        {C.heading}
      </Text>
      <HStack className="flex-wrap items-center justify-between gap-2">
        <Text className="text-footnote text-foreground">
          {C.toProject}{' '}
          <Text className="text-footnote font-bold text-foreground">{csv.project}</Text>
        </Text>
        <Act kind="link" label={C.sample} onPress={() => notice(C.sampleDone)} />
      </HStack>
      <Seg
        kind="radio"
        label={SPOKEN.source}
        items={C.modes}
        value={mode}
        onChange={setMode}
        testID="csv-mode"
      />
      <Soft>
        <HStack className="flex-wrap items-center justify-between gap-2">
          <Text className="text-subhead text-foreground">{csv.file}</Text>
          <Act kind="link" label={C.change} onPress={() => notice(C.changeDone)} />
        </HStack>
      </Soft>
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-headline font-semibold text-foreground">
          {C.preview}
        </Text>
        <Text className="text-footnote text-muted-foreground">{csv.summary}</Text>
      </VStack>
      {csv.rows.map((row, i) => (
        <CsvRowCard key={row.title} row={row} i={i} />
      ))}
      <Text className="text-footnote text-muted-foreground">{C.footNote}</Text>
    </TaskPage>
  );
}
