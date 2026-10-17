import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { Field } from '../../design/Field';
import { Select, type SelectOption } from '../../design/Select';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { createAsset, type AssetCriticality } from './api';

export interface CreateAssetDialogProps {
  open: boolean;
  onClose: () => void;
  assetTypeOptions: SelectOption[];
  locationOptions: SelectOption[];
}

const CRITICALITY_OPTIONS: SelectOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const createAssetFormSchema = z.object({
  tag: z
    .string()
    .trim()
    .min(1, 'Tag is required')
    .max(255, 'Tag must be 255 characters or fewer'),
  assetTypeId: z.string().min(1, 'Asset type is required'),
  locationId: z.string().min(1, 'Location is required'),
  manufacturer: z
    .string()
    .trim()
    .max(255, 'Manufacturer must be 255 characters or fewer'),
  model: z.string().trim().max(255, 'Model must be 255 characters or fewer'),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  installedAt: z.string(),
});

type CreateAssetFormValues = z.infer<typeof createAssetFormSchema>;
type FieldErrors = Partial<Record<keyof CreateAssetFormValues, string>>;

const EMPTY_VALUES: CreateAssetFormValues = {
  tag: '',
  assetTypeId: '',
  locationId: '',
  manufacturer: '',
  model: '',
  criticality: 'MEDIUM',
  installedAt: '',
};

export function CreateAssetDialog({
  open,
  onClose,
  assetTypeOptions,
  locationOptions,
}: CreateAssetDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreateAssetFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const tagRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assets', 'list'] });
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

  function setField<K extends keyof CreateAssetFormValues>(
    key: K,
    value: CreateAssetFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createAssetFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CreateAssetFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      if (nextErrors.tag) tagRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const data = result.data;
    mutation.mutate({
      tag: data.tag,
      assetTypeId: data.assetTypeId,
      locationId: data.locationId,
      manufacturer: data.manufacturer || undefined,
      model: data.model || undefined,
      criticality: data.criticality as AssetCriticality,
      installedAt: data.installedAt || undefined,
    });
  }

  return (
    <Dialog open={open} title="Create asset" onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          <Field label="Tag" error={fieldErrors.tag}>
            <input
              ref={tagRef}
              type="text"
              placeholder="PUMP-01"
              value={values.tag}
              onChange={(event) => setField('tag', event.target.value)}
            />
          </Field>

          <Field label="Asset type" error={fieldErrors.assetTypeId}>
            <Select
              options={assetTypeOptions}
              value={values.assetTypeId}
              onChange={(value) => setField('assetTypeId', value)}
              searchable
              placeholder="Select an asset type"
            />
          </Field>

          <Field label="Location" error={fieldErrors.locationId}>
            <Select
              options={locationOptions}
              value={values.locationId}
              onChange={(value) => setField('locationId', value)}
              searchable
              placeholder="Select a location"
            />
          </Field>

          <Field label="Criticality" error={fieldErrors.criticality}>
            <Select
              options={CRITICALITY_OPTIONS}
              value={values.criticality}
              onChange={(value) =>
                setField(
                  'criticality',
                  value as CreateAssetFormValues['criticality'],
                )
              }
            />
          </Field>

          <Field label="Manufacturer" error={fieldErrors.manufacturer}>
            <input
              type="text"
              value={values.manufacturer}
              onChange={(event) => setField('manufacturer', event.target.value)}
            />
          </Field>

          <Field label="Model" error={fieldErrors.model}>
            <input
              type="text"
              value={values.model}
              onChange={(event) => setField('model', event.target.value)}
            />
          </Field>

          <Field label="Installed on" error={fieldErrors.installedAt}>
            <input
              type="date"
              value={values.installedAt}
              onChange={(event) => setField('installedAt', event.target.value)}
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
            Create asset
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
