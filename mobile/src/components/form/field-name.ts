// Accessible name of a form control. React Native has no "required" state for screen readers, so a required control
// says the word in its name ("Title, required") and its visible star stays out of the reading order.

export const REQUIRED = 'required';

/** "Title" or, when required, "Title, required". */
export const fieldName = (label: string, required?: boolean) =>
  required ? `${label}, ${REQUIRED}` : label;
