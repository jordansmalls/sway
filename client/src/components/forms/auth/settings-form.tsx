import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import {
  useCurrentUserQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
  useDeleteAccountMutation,
  type UpdateProfileInput,
  type UpdatePasswordInput,
} from '../../../api';

type ProfileErrors = {
  username?: string;
  email?: string;
};

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function SettingsForm() {
  const { data: userData, isLoading: isLoadingUser } = useCurrentUserQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();
  const deleteAccountMutation = useDeleteAccountMutation();

  // Profile state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  // Delete account state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Initialize form with user data
  useEffect(() => {
    if (userData?.user) {
      setUsername(userData.user.username);
      setEmail(userData.user.email);
    }
  }, [userData]);

  function validateProfile(): boolean {
    const errors: ProfileErrors = {};

    if (!username || username.length < 2) {
      errors.username = 'Username must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validatePassword(): boolean {
    const errors: PasswordErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!newPassword || newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateProfile()) return;

    const input: UpdateProfileInput = { username, email };

    try {
      await updateProfileMutation.mutateAsync(input);
      toast.success("That has a nice ring to it.", {description:'You have successfully updated your account.'});
    } catch (err) {
      console.error("There was an error updating a user's profile:", err);
      toast.error("Something went wrong.", { description: "We're having trouble updating your profile, please try again." })
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validatePassword()) return;

    const input: UpdatePasswordInput = {
      currentPassword,
      newPassword,
    };

    try {
      await updatePasswordMutation.mutateAsync(input);
      toast.success('Success!', { description: "You have successfully updated your password."});
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err) {
      console.error("There was an error updating a user's password:", err);
      toast.error( "Oops! Something went wrong.",{ description:'Failed to update password'} );
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') {
      toast.error("Whoops!", { description: 'Please type DELETE to confirm' });
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync();
      toast.success("We hate to see you go.", { description: "You have successfully deleted your account." })
    } catch (err) {
      console.error("There was an error attempting to delete a user's account:", err);
      toast.error("Something went wrong.", { description: "We're having trouble deleting your account. Maybe it's a sign? Please try again." })
    }
  }

  const hasProfileChanges =
    username !== (userData?.user.username ?? '') ||
    email !== (userData?.user.email ?? '');

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your username and email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (profileErrors.username) {
                    setProfileErrors((prev) => ({
                      ...prev,
                      username: undefined,
                    }));
                  }
                }}
                aria-invalid={!!profileErrors.username}
              />
              {profileErrors.username && (
                <p className="text-sm font-medium text-destructive">
                  {profileErrors.username}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (profileErrors.email) {
                    setProfileErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                aria-invalid={!!profileErrors.email}
              />
              {profileErrors.email && (
                <p className="text-sm font-medium text-destructive">
                  {profileErrors.email}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || !hasProfileChanges}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      currentPassword: undefined,
                    }));
                  }
                }}
                aria-invalid={!!passwordErrors.currentPassword}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm font-medium text-destructive">
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      newPassword: undefined,
                    }));
                  }
                }}
                aria-invalid={!!passwordErrors.newPassword}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm font-medium text-destructive">
                  {passwordErrors.newPassword}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                }}
                aria-invalid={!!passwordErrors.confirmPassword}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm font-medium text-destructive">
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={
                updatePasswordMutation.isPending ||
                (!currentPassword && !newPassword && !confirmPassword)
              }
            >
              {updatePasswordMutation.isPending
                ? 'Updating...'
                : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Once you delete your account, there is no going back. Please be
            certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-4">
                <p className="text-sm text-muted-foreground">
                  Type{' '}
                  <span className="font-semibold text-foreground">DELETE</span>{' '}
                  to confirm:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteConfirmText !== 'DELETE' ||
                    deleteAccountMutation.isPending
                  }
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccountMutation.isPending
                    ? 'Deleting...'
                    : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
