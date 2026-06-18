import RequestDialog from '../dialogs/request-dialog';

interface MakeRequestProps {
  roomId: string | null;
  triggerText: string | null;
}

const MakeRequest = ({ roomId, triggerText }: MakeRequestProps) => {
  return (
    <div className="lg:px-4 lg:py-2 lg:max-w-[40rem] max-w-[23rem] mx-auto">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex-1">
          <h2 className="font-semibold text-sm sm:text-base leading-tight tracking-tight text-foreground break-words">
            Make a Song Request!
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground tracking-tight font-medium mt-0.5">
            Add a song to the queue and get the party going.
          </p>
        </div>

        <RequestDialog
          roomId={roomId}
          triggerText={triggerText}
          classes="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-full px-5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
        />
      </div>
    </div>
  );
};

export default MakeRequest;