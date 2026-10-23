import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { restockSparePart, type SparePart } from './api';

export interface RestockSparePartDialogProps {
  open: boolean;
  onClose: () => void;
  part: SparePart | null;
}

const restockFormSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, 'Quantity is required')
    .refine((value) => /^\d+$/.test(value), 'Quantity must be a whole number')
    .refine((value) => Number(value) >= 1, 'Quantity must be at least 1')
    .refine(
      (value) => Number(value) <= 1_000_000,
      'Quantity must be 1,000,000 or fewer',
    ),
});

type RestockFormValues = z.infer<typeof restockFormSchema>;
type FieldErrors = Partial<Record<keyof RestockFormValues, string>>;

const EMPTY_VALUES: RestockFormValues = { quantity: '' };

export function RestockSparePartDialog({
  open,
  onClose,
  part,
}: RestockSparePartDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<RestockFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (input: { quantity: number }) => {
      if (!part) throw new Error('No spare part selected');
      return restockSparePart(part.id, input);
    },
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = restockFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RestockFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      quantityRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    mutation.mutate({ quantity: Number(result.data.quantity) });
  }

  if (!part) return null;

  return (
    <Dialog open={open} title={`Restock ${part.sku}`} onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <p className="font-display text-body font-normal text-text-silver">
          {part.name} — currently {part.quantityOnHand} on hand.
        </p>

        <Field label="Quantity to add" error={fieldErrors.quantity}>
          <input
            ref={quantityRef}
            type="number"
            min={1}
            max={1_000_000}
            step={1}
            value={values.quantity}
            onChange={(event) => setValues({ quantity: event.target.value })}
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
            Restock
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
