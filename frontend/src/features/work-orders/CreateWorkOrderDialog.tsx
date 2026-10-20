import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { Select, type SelectOption } from '../../design/Select';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { createWorkOrder, type WorkOrderPriority } from './api';

export interface CreateWorkOrderDialogProps {
  open: boolean;
  onClose: () => void;
  assetOptions: SelectOption[];
}

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const createWorkOrderFormSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

type CreateWorkOrderFormValues = z.infer<typeof createWorkOrderFormSchema>;
type FieldErrors = Partial<Record<keyof CreateWorkOrderFormValues, string>>;

const EMPTY_VALUES: CreateWorkOrderFormValues = {
  assetId: '',
  description: '',
  priority: 'MEDIUM',
};

export function CreateWorkOrderDialog({
  open,
  onClose,
  assetOptions,
}: CreateWorkOrderDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreateWorkOrderFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: createWorkOrder,
    onSuccess: (workOrder) => {
      void queryClient.invalidateQueries({ queryKey: ['work-orders', 'list'] });
      handleClose();
      navigate(`/work-orders/${workOrder.id}`, { state: { created: true } });
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

  function setField<K extends keyof CreateWorkOrderFormValues>(
    key: K,
    value: CreateWorkOrderFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createWorkOrderFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as
          keyof CreateWorkOrderFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      if (nextErrors.description) descriptionRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const data = result.data;
    mutation.mutate({
      assetId: data.assetId,
      description: data.description,
      priority: data.priority as WorkOrderPriority,
    });
  }

  return (
    <Dialog open={open} title="Create work order" onClose={handleClose}>
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

          <Field label="Description" error={fieldErrors.description}>
            <textarea
              ref={descriptionRef}
              rows={4}
              placeholder="Pump bearing making unusual noise"
              value={values.description}
              onChange={(event) => setField('description', event.target.value)}
            />
          </Field>

          <Field label="Priority" error={fieldErrors.priority}>
            <Select
              options={PRIORITY_OPTIONS}
              value={values.priority}
              onChange={(value) =>
                setField(
                  'priority',
                  value as CreateWorkOrderFormValues['priority'],
                )
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
            Create work order
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
