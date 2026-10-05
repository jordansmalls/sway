import { Link } from 'react-router-dom';
import { EntryPage } from '@/components/entry-page/entry-page';
import { Button } from '@/components/ui/button';
import { FieldDescription } from '@/components/ui/field';

export default function Demo() {
  return (
    <EntryPage>
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-5xl font-bold text-white tracking-tighter">
            Try it out now!
          </h1>
          <p className="text-sm text-white/50">
            Jump in and try Sway with zero friction. Choose whether you want to try the DJ or Guest experience. No signup, no
            setup, no pressure.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link to="/demo/dj">As DJ</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/demo/guest">As Guest</Link>
          </Button>
        </div>
        <FieldDescription className="px-6 text-center text-white/50">
          Ready for the real thing?{' '}
          <Link to="/signup" className="transition duration-150">
            Create an account
          </Link>
        </FieldDescription>
      </div>
    </EntryPage>
  );
}
