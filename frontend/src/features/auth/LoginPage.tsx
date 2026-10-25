import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../design/Button';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { GeometricMolecule } from '../../design/GeometricMolecule';
import { Heading } from '../../design/Heading';
import { Sphere } from '../../design/Sphere';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { signIn } from '../../lib/auth/session';
import { login } from './api';

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

interface IntendedLocationState {
  from?: { pathname: string; search?: string };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = loginFormSchema.safeParse({ email, password });
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(null);
      (nextErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const tokens = await login(result.data);
      await signIn(tokens);

      const state = location.state as IntendedLocationState | null;
      const from = state?.from;
      navigate(from ? `${from.pathname}${from.search ?? ''}` : '/', {
        replace: true,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('Email or password is not correct.');
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError('Too many attempts. Wait a minute and try again.');
      } else if (error instanceof ApiError) {
        setFormError(toUserMessage(error).message);
      } else {
        setFormError('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center overflow-hidden px-6 py-16 sm:px-9">
      <Sphere
        size={480}
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
      />

      <div className="relative mx-auto flex w-full max-w-page items-center justify-between gap-16">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 min-[900px]:mx-0">
          <Eyebrow tone="mist" size="eyebrow">
            Industrial Maintenance
          </Eyebrow>

          <Heading level={1} scale="display">
            Sign in
          </Heading>

          <p className="font-display text-body font-normal text-text-silver">
            Enter your email and password to reach the plant console.
          </p>

          <form
            className="flex flex-col gap-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <Field label="Email" error={fieldErrors.email}>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label="Password" error={fieldErrors.password}>
              <input
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {formError && (
              <p role="alert" className="font-ui text-ui text-accent-lavender">
                {formError}
              </p>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        <GeometricMolecule className="hidden w-64 shrink-0 min-[900px]:block" />
      </div>
    </div>
  );
}
