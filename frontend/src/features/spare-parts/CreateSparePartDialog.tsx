import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { createSparePart } from './api';

export interface CreateSparePartDialogProps {
  open: boolean;
  onClose: () => void;
}

const createSparePartFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(100, 'SKU must be 100 characters or fewer'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or fewer'),
  initialQuantity: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d+$/.test(value),
      'Initial quantity must be a whole number',
    )
    .refine(
      (value) => value === '' || Number(value) <= 1_000_000,
      'Initial quantity must be 1,000,000 or fewer',
    ),
  reorderThreshold: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d+$/.test(value),
      'Reorder threshold must be a whole number',
    )
    .refine(
      (value) => value === '' || Number(value) <= 1_000_000,
      'Reorder threshold must be 1,000,000 or fewer',
    ),
  unitCost: z
    .string()
    .trim()
    .min(1, 'Unit cost is required')
    .refine(
      (value) => /^\d+(\.\d{1,2})?$/.test(value),
      'Unit cost must be a number with up to 2 decimal places',
    )
    .refine(
      (value) => Number(value) <= 99_999_999.99,
      'Unit cost must be 99,999,999.99 or fewer',
    ),
});

type CreateSparePartFormValues = z.infer<typeof createSparePartFormSchema>;
type FieldErrors = Partial<Record<keyof CreateSparePartFormValues, string>>;

const EMPTY_VALUES: CreateSparePartFormValues = {
  sku: '',
  name: '',
  initialQuantity: '',
  reorderThreshold: '',
  unitCost: '',
};

export function CreateSparePartDialog({
  open,
  onClose,
}: CreateSparePartDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreateSparePartFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const skuRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: createSparePart,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spare-parts', 'list'] });
      handleClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const { field, message } = toUserMessage(error);
        if (field && field in EMPTY_VALUES) {
          setFieldErrors({ [field]: message } as FieldErrors);
          setFormError(null);
        } else {
          setFormError(message);
        }
      } else {
        setFormError('Something went wrong. Try again.');
      }
    },
  });

  function handleClose() {
    setValues(EMPTY_VALUES);
    setFieldErrors({});
    setFormError(null);
    onClose();
  }

  function setField<K extends keyof CreateSparePartFormValues>(
    key: K,
    value: CreateSparePartFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createSparePartFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as
          keyof CreateSparePartFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      if (nextErrors.sku) skuRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const data = result.data;
    mutation.mutate({
      sku: data.sku,
      name: data.name,
      initialQuantity:
        data.initialQuantity === '' ? undefined : Number(data.initialQuantity),
      reorderThreshold:
        data.reorderThreshold === ''
          ? undefined
          : Number(data.reorderThreshold),
      unitCost: Number(data.unitCost),
    });
  }

  return (
    <Dialog open={open} title="Add part" onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          <Field label="SKU" error={fieldErrors.sku}>
            <input
              ref={skuRef}
              type="text"
              placeholder="BRG-6205"
              value={values.sku}
              onChange={(event) => setField('sku', event.target.value)}
            />
          </Field>

          <Field label="Name" error={fieldErrors.name}>
            <input
              type="text"
              placeholder="Ball bearing 6205"
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
            />
          </Field>

          <Field
            label="Initial quantity"
            error={fieldErrors.initialQuantity}
            hint="Defaults to 0"
          >
            <input
              type="number"
              min={0}
              max={1_000_000}
              step={1}
              value={values.initialQuantity}
              onChange={(event) =>
                setField('initialQuantity', event.target.value)
              }
            />
          </Field>

          <Field
            label="Reorder threshold"
            error={fieldErrors.reorderThreshold}
            hint="Defaults to 0"
          >
            <input
              type="number"
              min={0}
              max={1_000_000}
              step={1}
              value={values.reorderThreshold}
              onChange={(event) =>
                setField('reorderThreshold', event.target.value)
              }
            />
          </Field>

          <Field label="Unit cost" error={fieldErrors.unitCost}>
            <input
              type="number"
              min={0}
              max={99_999_999.99}
              step={0.01}
              value={values.unitCost}
              onChange={(event) => setField('unitCost', event.target.value)}
            />
          </Field>
        </div>

        {formError && (
          <p role="alert" className="font-ui text-ui text-accent-lavender">
            {formError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add part
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
