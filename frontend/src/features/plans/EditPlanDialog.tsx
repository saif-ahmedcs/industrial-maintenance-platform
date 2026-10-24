import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { Select, type SelectOption } from '../../design/Select';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { updateMaintenancePlan, type MaintenancePlan } from './api';

export interface EditPlanDialogProps {
  open: boolean;
  onClose: () => void;
  plan: MaintenancePlan | null;
}

const ACTIVE_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const editPlanFormSchema = z.object({
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
  active: z.enum(['true', 'false']),
});

type EditPlanFormValues = z.infer<typeof editPlanFormSchema>;
type FieldErrors = Partial<Record<keyof EditPlanFormValues, string>>;

const EMPTY_VALUES: EditPlanFormValues = {
  name: '',
  intervalDays: '',
  active: 'true',
};

function valuesFromPlan(plan: MaintenancePlan | null): EditPlanFormValues {
  if (!plan) return EMPTY_VALUES;
  return {
    name: plan.name,
    intervalDays: String(plan.intervalDays),
    active: plan.active ? 'true' : 'false',
  };
}

export function EditPlanDialog({ open, onClose, plan }: EditPlanDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<EditPlanFormValues>(
    valuesFromPlan(plan),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever a different plan is opened for editing.
  useEffect(() => {
    setValues(valuesFromPlan(plan));
    setFieldErrors({});
    setFormError(null);
  }, [plan]);

  const mutation = useMutation({
    mutationFn: (input: {
      name: string;
      intervalDays: number;
      active: boolean;
    }) => {
      if (!plan) throw new Error('No plan selected');
      return updateMaintenancePlan(plan.id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      onClose();
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
    setFieldErrors({});
    setFormError(null);
    onClose();
  }

  function setField<K extends keyof EditPlanFormValues>(
    key: K,
    value: EditPlanFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;

    const result = editPlanFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof EditPlanFormValues | undefined;
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
      name: data.name,
      intervalDays: Number(data.intervalDays),
      active: data.active === 'true',
    });
  }

  return (
    <Dialog
      open={open}
      title={`Edit ${plan?.name ?? 'plan'}`}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          <Field label="Name" error={fieldErrors.name}>
            <input
              ref={nameRef}
              type="text"
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

          <Field label="Status" error={fieldErrors.active}>
            <Select
              options={ACTIVE_OPTIONS}
              value={values.active}
              onChange={(value) =>
                setField('active', value as EditPlanFormValues['active'])
              }
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
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
