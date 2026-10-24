// Projects ⑤ Tell us about the project (prototype projects.story.jsx ProjectsStory): the story, prefilled with the
// attendance sample, its character count, Speak (not active yet) and what a good story mentions. Build draft opens the
// draft the "AI" built from it (no LLM in Phase 1).
import { Redirect, router } from 'expo-router';
import { Mic } from 'lucide-react-native';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { DetailPage } from '@/components/screen/detail-page';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getProjectCreate } from '@/data/projects';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Ai, Foot, Note, Soft } from '../parts/project-parts';
import { STORY } from '../projects.strings';

/** Longest story the AI takes (prototype counter "/ 2000 characters"). */
const MAX_STORY = 2000;

/** The story step, for a Manager or Admin; a Member goes home. */
export function ProjectStoryScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const [text, setText] = useState(() => getProjectCreate(role).story);
  if (!allowedScreen('projects.story', role)) return <Redirect href="/" />;
  return (
    <DetailPage
      testID="project-story"
      title={STORY.title}
      foot={
        <Foot
          label={STORY.build}
          ok={!!text.trim()}
          onPress={() => router.push('/projects/new/draft')}
        >
          <HStack className="items-center gap-1">
            <ButtonText>{STORY.build}</ButtonText>
            <Ai />
          </HStack>
        </Foot>
      }
    >
      <Text className="text-subhead text-muted-foreground">{STORY.lead}</Text>
      <Field
        label={STORY.label}
        multiline
        value={text}
        onChangeText={(t) => setText(t.slice(0, MAX_STORY))}
        hint={STORY.count(text.length, MAX_STORY)}
        testID="project-story-text"
      />
      <Soft>
        <HStack className="items-center gap-3">
          <Button variant="outline" isDisabled>
            <ButtonIcon as={Mic} />
            <ButtonText>{STORY.speak}</ButtonText>
          </Button>
          <Note>{STORY.soon}</Note>
        </HStack>
      </Soft>
      <VStack className="gap-1">
        <Text className="text-subhead font-semibold text-foreground">{STORY.mention}</Text>
        {STORY.mentions.map((m) => (
          <Text key={m} className="text-subhead text-muted-foreground">
            {`• ${m}`}
          </Text>
        ))}
      </VStack>
    </DetailPage>
  );
}
