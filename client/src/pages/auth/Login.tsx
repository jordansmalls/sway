import { LoginForm } from '../../components/forms/auth/login-form';

export default function Login() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="https://www.sway.onl"
            className="flex items-center gap-2 font-black tracking-tighter"
          >
            Sway
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1541126274323-dbac58d14741?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="DJ mixing tunes"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.5]"
        />
      </div>
    </div>
  );
}
