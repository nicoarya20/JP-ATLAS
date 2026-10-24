// Projects ③ New project · choose method (prototype projects.create.jsx ProjectsNew): tell the story to the AI
// (recommended), fill in the form, or start from a template. The modal's Cancel chevron is the only way out.
import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';

import { DetailPage } from '@/components/screen/detail-page';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Ai, Sec } from '../parts/project-parts';
import { CREATE } from '../projects.strings';

type Way = keyof typeof CREATE.ways;

function WayCard({ way, primary, mark }: { way: Way; primary?: boolean; mark?: ReactNode }) {
  const w = CREATE.ways[way];
  return (
    <Sec strong={primary} testID={`way-${way}`}>
      <HStack className="items-center justify-between gap-2">
        <HStack className="flex-1 items-center gap-1">
          <Text accessibilityRole="header" className="text-headline font-semibold">
            {w.title}
          </Text>
          {mark}
        </HStack>
        {primary && (
          <Badge variant="info">
            <BadgeText>{CREATE.recommended}</BadgeText>
          </Badge>
        )}
      </HStack>
      <Text className="text-subhead">{w.desc}</Text>
      <HStack className="items-end justify-between gap-3">
        <Text className="flex-1 text-subhead text-muted-foreground">{w.hint}</Text>
        <Button
          size="sm"
          variant={primary ? 'default' : 'outline'}
          accessibilityHint={w.title}
          onPress={() => router.push(`/projects/new/${way}`)}
        >
          <ButtonText>{CREATE.choose}</ButtonText>
        </Button>
      </HStack>
    </Sec>
  );
}

/** New project, for a Manager or Admin; a Member goes home. */
export function NewProjectScreen({ role = SESSION_ROLE }: { role?: Role }) {
  if (!allowedScreen('projects.new', role)) return <Redirect href="/" />;
  return (
    <DetailPage testID="project-new" title={CREATE.title} modal>
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-section font-bold">
          {CREATE.heading}
        </Text>
        <Text className="text-subhead">{CREATE.lead}</Text>
      </VStack>
      <WayCard way="story" primary mark={<Ai />} />
      <WayCard way="form" />
      <WayCard way="template" />
    </DetailPage>
  );
}
