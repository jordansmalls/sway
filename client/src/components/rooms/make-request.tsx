import { Plus } from 'lucide-react';
import RequestDialog from '../dialogs/request-dialog';

interface MakeRequestProps {
  roomId: string;
  triggerText: string;
}

const MakeRequest = ({ roomId, triggerText }: MakeRequestProps) => (
  <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-16px_rgba(0,0,0,0.35)] backdrop-blur-lg sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
    <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl sm:border sm:bg-card sm:p-4 sm:shadow-sm">
      <div className="hidden min-w-0 flex-1 sm:block">
        <h2 className="font-semibold leading-tight tracking-tight">Have a song in mind?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add it to the queue and let the room vote.</p>
      </div>
      <RequestDialog pulsating roomId={roomId} triggerText={triggerText} classes="h-12 w-full rounded-xl bg-[#1e90ff] text-white text-sm font-semibold shadow-sm sm:h-10 sm:w-auto sm:rounded-full sm:px-5" triggerIcon={<Plus className="size-4" aria-hidden="true" />} />
    </div>
  </div>
);

export default MakeRequest;
