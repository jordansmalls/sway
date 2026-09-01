import { SwayLogo } from '@/components/sway-logo';
import { SignupForm } from '../../components/forms/auth/signup-form';

export default function Signup() {
  return (
    <div className="grid min-h-svh bg-white text-zinc-950 dark:bg-background dark:text-foreground lg:grid-cols-[44%_56%]">
        <section className="relative flex min-h-svh flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-20">
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md">
              <div className="mb-9 flex flex-col items-center text-center">
                <a
                  href="https://www.sway.onl"
                  className="mb-7 flex w-fit items-center gap-2.5 text-xl font-bold tracking-[-0.04em]"
                >
                  <SwayLogo className="h-8" />
                </a>
                <h1 className="max-w-sm text-3xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-4xl">
                  Turn every set into a shared experience.
                </h1>
              </div>
            <SignupForm />
            </div>
          </div>
        </section>

        <aside className="relative m-3 ml-0 hidden min-h-0 overflow-hidden rounded-[1.75rem] bg-zinc-100 lg:block">
          <img
            src="https://images.unsplash.com/photo-1667830494763-621e251801c4?q=85&w=1600&auto=format&fit=crop"
            alt="DJ performing for a crowd"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-75"
          />
        </aside>
    </div>
  );
}
