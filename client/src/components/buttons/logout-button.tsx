import { useNavigate } from 'react-router-dom';
import { SpinnerButton } from './spinner-button';
import { useLogoutMutation } from '@/api/auth';
import { toast } from 'sonner';

export default function LogoutButton() {
  const navigate = useNavigate();
  const { mutateAsync: logout, isPending } = useLogoutMutation();

  const handleLogout = async () => {
    if (isPending) return;
    try {
      await logout();

      toast.success('See you next time!', {
        description: 'You have been successfully logged out.',
      });
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('There was an error attempting to log out:', err);
      toast.error('Oops!', {
        description:
          'Something went wrong on our end. Please try logging out again.',
      });
    }
  };

  return (
    <SpinnerButton
      onClick={handleLogout}
      isLoading={isPending}
      loadingText="Please wait..."
      variant={"destructive"}
    >
      Logout
    </SpinnerButton>
  );
}
