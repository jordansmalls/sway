import { useLocation } from 'react-router-dom';
import { EntryPage } from '@/components/entry-page/entry-page';
import { ResetPasswordForm } from '@/components/forms/auth/reset-password-form';

export default function ResetPassword() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get('token') ?? '';
  return (
    <EntryPage>
      <ResetPasswordForm key={token} token={token} />
    </EntryPage>
  );
}
