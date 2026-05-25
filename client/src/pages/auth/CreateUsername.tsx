import { CreateUsernameForm } from '../../components/forms/auth/create-username-form';

export default function CreateUsername() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CreateUsernameForm />
      </div>
    </div>
  );
}
