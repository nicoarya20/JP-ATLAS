// Tag box of New task · Fill form and Edit task (prototype tasks.edit.lists.jsx TagsEdit): the tags as removable
// chips over a box that adds the typed tag.
import { X } from 'lucide-react-native';
import { useState } from 'react';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { addTag } from '@/data/tasks.form';

import { Labelled } from '../parts/labelled';
import { F } from '../tasks.strings';

/** Tags as removable chips; submitting the box adds the typed tag (lowercase, no duplicates). */
export function TagsEdit({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [text, setText] = useState('');
  const add = () => {
    onChange(addTag(tags, text));
    setText('');
  };
  return (
    <Labelled label={F.tags.label}>
      <VStack className="gap-2 rounded-control bg-muted p-2">
        {tags.length > 0 && (
          <HStack className="flex-wrap gap-2">
            {tags.map((t) => (
              <HStack key={t} className="items-center rounded-control border border-border pl-2">
                <Text className="text-footnote text-foreground">{t}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={F.tags.remove(t)}
                  onPress={() => onChange(tags.filter((x) => x !== t))}
                  className="h-11 w-11 items-center justify-center"
                >
                  <Icon as={X} size="sm" className="text-muted-foreground" />
                </Pressable>
              </HStack>
            ))}
          </HStack>
        )}
        <Input className="min-h-11 border-0 bg-card">
          <InputField
            aria-label={F.tags.add}
            placeholder={F.tags.hint}
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            autoCapitalize="none"
          />
        </Input>
      </VStack>
    </Labelled>
  );
}
