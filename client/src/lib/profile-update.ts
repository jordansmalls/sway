import type { UpdateProfileInput } from '@/api/users';

/** The server compares emails case-insensitively after trimming. */
export function isEmailChange(email: string, savedEmail: string) {
  return email.trim().toLowerCase() !== savedEmail.trim().toLowerCase();
}

/** Only send the current password when the email changes; the server requires it then. */
export function buildProfileUpdate(values: { username: string; email: string; currentPassword: string }, savedEmail: string): UpdateProfileInput {
  const input: UpdateProfileInput = { username: values.username, email: values.email };
  if (isEmailChange(values.email, savedEmail)) input.currentPassword = values.currentPassword;
  return input;
}
