import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpinnerButton } from './spinner-button';
import { useLogoutMutation } from '@/api/auth';
import { toast } from 'sonner';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LogoutButton() {
  const navigate = useNavigate();
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const { mutateAsync: logout } = useLogoutMutation();

  const handleLogout = async () => {
    try {
      setIsLocalLoading(true);

      await delay(1500);

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
      setIsLocalLoading(false);
    }
  };

  return (
    <SpinnerButton
      onClick={handleLogout}
      isLoading={isLocalLoading}
      loadingText="Please wait..."
      variant={"destructive"}
    >
      Logout
    </SpinnerButton>
  );
}