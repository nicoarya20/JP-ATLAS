// Form field (prototype kit Field): label with a required star, one- or multi-line text, a hint and an error line.
import type { ReactNode } from 'react';
import type { KeyboardTypeOptions } from 'react-native';

import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';

import { fieldName } from './field-name';

type FieldProps = {
  label: string;
  value: string;
  /** Left out for a read-only field. */
  onChangeText?: (text: string) => void;
  placeholder?: string;
  /** Draws the star after the label and names the field "<label>, required" for screen readers. */
  required?: boolean;
  hint?: string;
  /** Shown under the field (announced as it appears), and marks it invalid. */
  error?: string;
  /** Leaving the field: a form shows "required" errors only once the field was touched. */
  onBlur?: () => void;
  /** Several lines (description, comment). */
  multiline?: boolean;
  /** Not usable for now (a dialog is busy). */
  disabled?: boolean;
  /** Read-only (Role, Email): shown on a muted box and still read out, but not editable. */
  readOnly?: boolean;
  keyboardType?: KeyboardTypeOptions;
  /** Trailing element inside the box (an icon button). */
  right?: ReactNode;
  testID?: string;
};

/** Labelled text input; the label is the input's accessible name ("Title *" reads as "Title, required"). */
export function Field(p: FieldProps) {
  // aria-label, not accessibilityLabel: gluestack sets aria-label "Input Field" itself, and aria-label wins in RN.
  const a11y = {
    'aria-label': fieldName(p.label, p.required),
    accessibilityHint: p.hint,
    onBlur: p.onBlur,
  };
  return (
    <FormControl
      isRequired={p.required}
      isInvalid={!!p.error}
      isDisabled={p.disabled}
      isReadOnly={p.readOnly}
    >
      {/* The input carries the label as its name; read here too, it would be said twice. gluestack adds the star. */}
      <FormControlLabel accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <FormControlLabelText className="text-footnote text-muted-foreground">
          {p.label}
        </FormControlLabelText>
      </FormControlLabel>
      {p.multiline ? (
        <Textarea className="rounded-control">
          <TextareaInput
            {...a11y}
            testID={p.testID}
            value={p.value}
            onChangeText={p.onChangeText}
            placeholder={p.placeholder}
            className="text-body"
          />
        </Textarea>
      ) : (
        <Input className={`min-h-11 rounded-control ${p.readOnly ? 'bg-muted' : ''}`}>
          <InputField
            {...a11y}
            testID={p.testID}
            value={p.value}
            onChangeText={p.onChangeText}
            placeholder={p.placeholder}
            keyboardType={p.keyboardType}
            className="text-body"
          />
          {p.right && (
            // Not a button itself, and its content (a Copy button) stays reachable: gluestack hides slot children.
            <InputSlot
              accessible={false}
              accessibilityElementsHidden={false}
              focusOnPress={false}
              className="pr-2"
            >
              {p.right}
            </InputSlot>
          )}
        </Input>
      )}
      {p.hint && !p.error && (
        <FormControlHelper>
          <FormControlHelperText className="text-footnote">{p.hint}</FormControlHelperText>
        </FormControlHelper>
      )}
      {p.error && (
        <FormControlError>
          <FormControlErrorText accessibilityLiveRegion="polite" className="text-footnote">
            {p.error}
          </FormControlErrorText>
        </FormControlError>
      )}
    </FormControl>
  );
}
