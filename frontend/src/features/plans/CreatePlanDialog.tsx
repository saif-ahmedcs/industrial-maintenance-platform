import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { Select, type SelectOption } from '../../design/Select';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { createMaintenancePlan } from './api';

export interface CreatePlanDialogProps {
  open: boolean;
  onClose: () => void;
  assetOptions: SelectOption[];
}

const createPlanFormSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or fewer'),
  intervalDays: z
    .string()
    .trim()
    .min(1, 'Interval is required')
    .refine((value) => /^\d+$/.test(value), 'must be an integer number')
    .refine((value) => Number(value) >= 1, 'must not be less than 1')
    .refine(
      (value) => Number(value) <= 3650,
      'must be less than or equal to 3650',
    ),
});

type CreatePlanFormValues = z.infer<typeof createPlanFormSchema>;
type FieldErrors = Partial<Record<keyof CreatePlanFormValues, string>>;

const EMPTY_VALUES: CreatePlanFormValues = {
  assetId: '',
  name: '',
  intervalDays: '',
};

export function CreatePlanDialog({
  open,
  onClose,
  assetOptions,
}: CreatePlanDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreatePlanFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: createMaintenancePlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
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

  function setField<K extends keyof CreatePlanFormValues>(
    key: K,
    value: CreatePlanFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createPlanFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CreatePlanFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      if (nextErrors.name) nameRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const data = result.data;
    mutation.mutate({
      assetId: data.assetId,
      name: data.name,
      intervalDays: Number(data.intervalDays),
    });
  }

  return (
    <Dialog open={open} title="Create maintenance plan" onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          <Field label="Asset" error={fieldErrors.assetId}>
            <Select
              options={assetOptions}
              value={values.assetId}
              onChange={(value) => setField('assetId', value)}
              searchable
              placeholder="Select an asset"
            />
          </Field>

          <Field label="Name" error={fieldErrors.name}>
            <input
              ref={nameRef}
              type="text"
              placeholder="Quarterly lubrication"
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
            />
          </Field>

          <Field
            label="Interval (days)"
            error={fieldErrors.intervalDays}
            hint="Whole number, 1 to 3650"
          >
            <input
              type="number"
              min={1}
              max={3650}
              step={1}
              value={values.intervalDays}
              onChange={(event) => setField('intervalDays', event.target.value)}
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
            Create plan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
