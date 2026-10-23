import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { adjustSparePart, type SparePart } from './api';

export interface AdjustSparePartDialogProps {
  open: boolean;
  onClose: () => void;
  part: SparePart | null;
}

const adjustFormSchema = z.object({
  delta: z
    .string()
    .trim()
    .min(1, 'Delta is required')
    .refine((value) => /^-?\d+$/.test(value), 'Delta must be a whole number')
    .refine((value) => Number(value) !== 0, 'Delta must not be equal to 0')
    .refine(
      (value) => Number(value) >= -1_000_000 && Number(value) <= 1_000_000,
      'Delta must be between -1,000,000 and 1,000,000',
    ),
  reason: z
    .string()
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason must be 500 characters or fewer'),
});

type AdjustFormValues = z.infer<typeof adjustFormSchema>;
type FieldErrors = Partial<Record<keyof AdjustFormValues, string>>;

const EMPTY_VALUES: AdjustFormValues = { delta: '', reason: '' };

export function AdjustSparePartDialog({
  open,
  onClose,
  part,
}: AdjustSparePartDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AdjustFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const deltaRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (input: { delta: number; reason: string }) => {
      if (!part) throw new Error('No spare part selected');
      return adjustSparePart(part.id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spare-parts', 'list'] });
      handleClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setFieldErrors({ delta: error.message });
          setFormError(null);
          return;
        }
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

  function setField<K extends keyof AdjustFormValues>(
    key: K,
    value: AdjustFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = adjustFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AdjustFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      if (nextErrors.delta) deltaRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    mutation.mutate({
      delta: Number(result.data.delta),
      reason: result.data.reason,
    });
  }

  if (!part) return null;

  return (
    <Dialog open={open} title={`Adjust ${part.sku}`} onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <p className="font-display text-body font-normal text-text-silver">
          {part.name} — currently {part.quantityOnHand} on hand. Use a negative
          number to correct a shortfall, positive to correct an overcount.
        </p>

        <Field label="Delta" error={fieldErrors.delta}>
          <input
            ref={deltaRef}
            type="number"
            min={-1_000_000}
            max={1_000_000}
            step={1}
            placeholder="-3"
            value={values.delta}
            onChange={(event) => setField('delta', event.target.value)}
          />
        </Field>

        <Field label="Reason" error={fieldErrors.reason}>
          <textarea
            rows={3}
            placeholder="Physical count discrepancy found during cycle count"
            value={values.reason}
            onChange={(event) => setField('reason', event.target.value)}
          />
        </Field>

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
            Save adjustment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
