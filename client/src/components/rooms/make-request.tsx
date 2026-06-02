import RequestDialog from '../dialogs/request-dialog';

interface MakeRequestProps {
    roomId: string | null;
    triggerText: string | null;
}

const MakeRequest = ({ roomId, triggerText }: MakeRequestProps) => {
  return (
    <div className="lg:px-4 lg:py-2 lg:max-w-[40rem] max-w-[23rem] mx-auto">
      <div className="bg-[dodgerblue] rounded-xl p-4 flex items-center justify-between gap-4">
        {/* Text Content */}
        <div className="flex-1">
          <h2 className="font-semibold lg:text-sm text-xs sm:text-base leading-tight tracking-tight text-primary-foreground break-words">
            Make a Song Request!
          </h2>
          <p className="text-xs sm:text-sm text-xs text-primary-foreground/80 tracking-tight font-medium mt-0.5">
            Add a song to the queue and get the party going.
          </p>
        </div>

        {/* Button */}
        <RequestDialog
          roomId={roomId}
          triggerText={triggerText}
          classes="bg-white text-[dodgerblue] hover:bg-white/80 cursor-pointer rounded-full px-5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0"
        />
      </div>
    </div>
  );
};

export default MakeRequest;