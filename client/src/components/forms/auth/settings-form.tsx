import { useState } from 'react';
import { Check, Laptop, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/api/client';

import { useCurrentUserQuery, useDeleteAccountMutation, useUpdatePasswordMutation, useUpdateProfileMutation, type UpdatePasswordInput, type UpdateProfileInput } from '@/api';
import { useToastPosition, type ToastPosition } from '@/hooks/use-toast-position';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type Section = 'account' | 'security' | 'appearance';
type ProfileErrors = { username?: string; email?: string };
type PasswordErrors = { currentPassword?: string; newPassword?: string; confirmPassword?: string };

const sections: { id: Section; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
];
const toastPositions: { value: ToastPosition; label: string }[] = [
  { value: 'top-left', label: 'Top left' }, { value: 'top-center', label: 'Top center' }, { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-center', label: 'Bottom center' }, { value: 'bottom-right', label: 'Bottom right' },
];

export function SettingsForm() {
  const [section, setSection] = useState<Section>('account');
  const { data: userData, isLoading } = useCurrentUserQuery();
  const updateProfile = useUpdateProfileMutation();
  const updatePassword = useUpdatePasswordMutation();
  const deleteAccount = useDeleteAccountMutation();
  const { theme, setTheme } = useTheme();
  const { position, setPosition } = useToastPosition();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const usernameValue = username ?? userData?.user.username ?? '';
  const emailValue = email ?? userData?.user.email ?? '';
  const hasProfileChanges = usernameValue !== (userData?.user.username ?? '') || emailValue !== (userData?.user.email ?? '');

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: ProfileErrors = {};
    if (usernameValue.length < 2) errors.username = 'Username must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) errors.email = 'Please enter a valid email';
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await updateProfile.mutateAsync({ username: usernameValue, email: emailValue } as UpdateProfileInput);
      toast.success('Account updated', { description: 'Your profile changes have been saved.' });
    } catch (error) {
      console.error("There was an error updating a user's profile:", error);
      toast.error('Could not update your profile', { description: getApiErrorMessage(error, 'Your changes were not saved. Please try again.') });
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: PasswordErrors = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await updatePassword.mutateAsync({ currentPassword, newPassword } as UpdatePasswordInput);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password updated', {
        description: 'Your new password is ready to use the next time you sign in.',
      });
    } catch (error) {
      console.error("There was an error updating a user's password:", error);
      toast.error('Could not update password', { description: getApiErrorMessage(error, 'Check your current password and try again. Your password has not changed.') });
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      await deleteAccount.mutateAsync();
      toast.success('Account deleted', { description: 'Your account has been removed and you have been signed out.' });
    } catch (error) {
      console.error("There was an error deleting the user's account:", error);
      toast.error('Could not delete your account', { description: getApiErrorMessage(error, 'Your account is still active. Please try again.') });
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <nav className="flex gap-1 overflow-x-auto border-b px-4 pt-3 sm:px-7" aria-label="Settings sections">
        {sections.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={cn('relative rounded-t-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground', section === item.id && 'text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground')}>{item.label}</button>)}
      </nav>

      {section === 'account' && <SettingsSection title="Account" description="Update the details connected to your Sway account.">
        <form onSubmit={handleProfileSubmit} className="grid gap-5 md:grid-cols-[220px_1fr]">
          <FieldCopy title="Profile information" description="This is how your account is identified across Sway." />
          <div className="space-y-4">{isLoading ? <div className="h-24 animate-pulse rounded-lg bg-muted" /> : <>
            <TextField id="username" label="Username" value={usernameValue} error={profileErrors.username} onChange={(value) => { setUsername(value); setProfileErrors((old) => ({ ...old, username: undefined })); }} />
            <TextField id="email" label="Email address" type="email" value={emailValue} error={profileErrors.email} onChange={(value) => { setEmail(value); setProfileErrors((old) => ({ ...old, email: undefined })); }} />
            <Button type="submit" disabled={!hasProfileChanges || updateProfile.isPending}>{updateProfile.isPending ? 'Saving…' : 'Save changes'}</Button>
          </>}</div>
        </form>
      </SettingsSection>}

      {section === 'security' && <>
        <SettingsSection title="Security" description="Manage your password and account access.">
          <form onSubmit={handlePasswordSubmit} className="grid gap-5 md:grid-cols-[220px_1fr]">
            <FieldCopy title="Change password" description="Use at least 8 characters for your new password." />
            <div className="space-y-4">
              <TextField id="currentPassword" label="Current password" type="password" value={currentPassword} error={passwordErrors.currentPassword} onChange={(value) => { setCurrentPassword(value); setPasswordErrors((old) => ({ ...old, currentPassword: undefined })); }} />
              <TextField id="newPassword" label="New password" type="password" value={newPassword} error={passwordErrors.newPassword} onChange={(value) => { setNewPassword(value); setPasswordErrors((old) => ({ ...old, newPassword: undefined })); }} />
              <TextField id="confirmPassword" label="Confirm new password" type="password" value={confirmPassword} error={passwordErrors.confirmPassword} onChange={(value) => { setConfirmPassword(value); setPasswordErrors((old) => ({ ...old, confirmPassword: undefined })); }} />
              <Button type="submit" disabled={updatePassword.isPending || (!currentPassword && !newPassword && !confirmPassword)}>{updatePassword.isPending ? 'Updating…' : 'Update password'}</Button>
            </div>
          </form>
        </SettingsSection>
        <div className="grid gap-5 border-t px-5 py-6 sm:px-7 md:grid-cols-[220px_1fr]">
          <FieldCopy title="Delete account" description="Permanently remove your account and its data." />
          <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmText('')}>
            <AlertDialogTrigger asChild><Button variant="destructive" className="w-fit">Delete account</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete your account?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Type DELETE to confirm.</AlertDialogDescription></AlertDialogHeader><Input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} placeholder="DELETE" /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleteAccount.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleteAccount.isPending ? 'Deleting…' : 'Delete account'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </>}

      {section === 'appearance' && <SettingsSection title="Appearance" description="Choose how Sway looks and where updates appear.">
        <div className="space-y-8">
          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <FieldCopy title="Color theme" description="Use a light or dark theme, or follow your device." />
            <div className="grid grid-cols-3 gap-3">{([
              ['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Laptop],
            ] as const).map(([value, label, Icon]) => <ChoiceCard key={value} selected={theme === value} onClick={() => setTheme(value)} label={label}><div className={cn('flex h-20 items-center justify-center rounded-md border bg-white text-zinc-900', value === 'dark' && 'bg-zinc-900 text-white', value === 'system' && 'bg-gradient-to-br from-white from-50% to-zinc-900 to-50%')}><Icon className="size-5" /></div></ChoiceCard>)}</div>
          </div>
          <div className="grid gap-5 border-t pt-8 md:grid-cols-[220px_1fr]">
            <FieldCopy title="Toast location" description="Choose where confirmations and notifications appear." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{toastPositions.map((item) => <ChoiceCard key={item.value} selected={position === item.value} onClick={() => { setPosition(item.value); toast.success('Notification position updated', { description: `New notifications will appear at the ${item.label.toLowerCase()} of your screen.` }); }} label={item.label}><ToastPreview position={item.value} /></ChoiceCard>)}</div>
          </div>
        </div>
      </SettingsSection>}
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section><div className="border-b px-5 py-6 sm:px-7"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="px-5 py-7 sm:px-7">{children}</div></section>;
}
function FieldCopy({ title, description }: { title: string; description: string }) {
  return <div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div>;
}
function TextField({ id, label, type = 'text', value, error, onChange }: { id: string; label: string; type?: string; value: string; error?: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={!!error} />{error && <p className="text-sm text-destructive">{error}</p>}</div>;
}
function ChoiceCard({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className="group text-left"><div className={cn('relative rounded-lg border-2 border-transparent p-1 transition-colors group-hover:border-muted-foreground/30', selected && 'border-foreground')}>{children}{selected && <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-foreground text-background"><Check className="size-3" /></span>}</div><span className="mt-2 block text-sm font-medium">{label}</span></button>;
}
function ToastPreview({ position }: { position: ToastPosition }) {
  const [vertical, horizontal] = position.split('-');
  return <div className={cn('flex h-20 rounded-md border bg-muted/40 p-2', vertical === 'top' ? 'items-start' : 'items-end', horizontal === 'left' ? 'justify-start' : horizontal === 'right' ? 'justify-end' : 'justify-center')}><span className="h-3 w-10 rounded-sm bg-foreground/70 shadow-sm" /></div>;
}
