/**
 * Domain validation rules
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

/**
 * Validate that a draft has all required fields for publishing
 */
export function validateDraftForPublish(draft: {
  title: string;
  imageUrl?: string;
  variants: Array<{ enabled: boolean }>;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!draft.title || draft.title.trim().length === 0) {
    errors.push({
      field: 'title',
      code: 'REQUIRED',
      message: 'Title is required',
    });
  }

  if (!draft.imageUrl) {
    errors.push({
      field: 'imageUrl',
      code: 'REQUIRED',
      message: 'Product image is required',
    });
  }

  const enabledVariants = draft.variants.filter((v) => v.enabled);
  if (enabledVariants.length === 0) {
    errors.push({
      field: 'variants',
      code: 'MIN_ONE_VARIANT',
      message: 'At least one variant must be enabled',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
