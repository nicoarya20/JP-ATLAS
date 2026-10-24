// Evidence section of the detail (prototype tasks.detail.jsx Evidence, tasks.detail.screens.jsx): photo placeholders
// with the file and its caption, "+ Attach evidence" on In progress (a toast for now), two columns on In review.
import { Image } from 'lucide-react-native';
import { View } from 'react-native';

import { useNotice } from '@/components/notice/use-notice';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskDetailView } from '@/data/tasks.detail';
import type { TaskProof } from '@/data/tasks.shared';

import { Act, Sec } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { SPOKEN, spoken } from '../tasks.strings.added';

function Evidence({ proof, half }: { proof: TaskProof; half: boolean }) {
  return (
    // One stop per evidence: "Photo, photo-1.jpg, <caption>".
    <VStack
      accessible
      accessibilityRole="image"
      accessibilityLabel={spoken(S.detail.photo, proof.file, proof.caption)}
      className={`gap-1 ${half ? 'w-[48%]' : ''}`}
    >
      <View className="h-20 w-28 items-center justify-center rounded-control bg-muted">
        <Icon as={Image} size="xl" className="text-muted-foreground" />
      </View>
      <Text className="text-footnote font-semibold text-foreground">{proof.file}</Text>
      <Text className="text-footnote text-muted-foreground">{proof.caption}</Text>
    </VStack>
  );
}

/** Evidence section, when the task has any. */
export function DetailEvidence({
  evidence,
  review,
}: {
  evidence: TaskDetailView['evidence'];
  review: boolean;
}) {
  const notice = useNotice();
  if (!evidence) return null;
  return (
    <Sec title={evidence.title}>
      <HStack className={review ? 'flex-wrap justify-between gap-y-3' : 'flex-col gap-3'}>
        {evidence.items.map((p) => (
          <Evidence key={p.file} proof={p} half={review} />
        ))}
      </HStack>
      {evidence.attach && (
        <Act
          kind="link"
          label={S.detail.attach}
          name={SPOKEN.attach}
          onPress={() => notice(S.detail.attached)}
        />
      )}
    </Sec>
  );
}
