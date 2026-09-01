import { useState } from 'react';
import { useDemoSession } from '@/components/demo/demo-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SpinnerButton } from '../buttons/spinner-button';
import SpotifySearch, { type SpotifySearchTrack } from '../rooms/spotify-search';
import { getApiErrorMessage } from '@/api/client';
import {
  createRequestTrackFromSpotifyTrack,
  useCreateRequestMutation,
} from '@/api/requests';

interface RequestDialogProps {
  roomId: string;
  triggerText: string;
  requestedBy: string;
  triggerClassName?: string;
}

const RequestDialogAdmin = ({
  roomId,
  triggerText,
  requestedBy,
  triggerClassName,
}: RequestDialogProps) => {
  const [selectedTrack, setSelectedTrack] = useState<SpotifySearchTrack | null>(null);
  const demo = useDemoSession();
  const [isOpen, setIsOpen] = useState(false);
  const createRequestMutation = useCreateRequestMutation();

  const handleTrackSelect = (track: SpotifySearchTrack) => {
    setSelectedTrack(track);
  };

  const createRequest = async () => {
    if (!selectedTrack) {
      toast.error("Choose a track first", { description: "Search for a song and select a result before adding it to the queue." })
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        roomId,
        requestedBy,
        track: createRequestTrackFromSpotifyTrack(selectedTrack),
      });

      setIsOpen(false);
      setSelectedTrack(null);

      toast.success("Track added", { description: `${selectedTrack.name} by ${selectedTrack.artist} has been added to the queue.` })

    } catch (err) {
      toast.error("Oops! Your request couldn't be processed.", {
        description: getApiErrorMessage(err, 'Please try again in a moment.'),
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequest();
  };

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedTrack(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* <Button variant="default">Make Request</Button> */}
        <Button
          variant="default"
          size="sm"
          className={cn('shrink-0 text-xs', triggerClassName)}
        >
          <span className="sm:hidden">Add Song</span>
          <span className="hidden sm:inline">{triggerText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className='tracking-tight'>
          <DialogHeader>
            <DialogTitle>Request a Track</DialogTitle>
            <DialogDescription>
              {demo ? "Search Spotify and add a song to your private demo queue. No Spotify login needed." : "Search Spotify's catalog and add a song to the request queue."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <SpotifySearch onTrackSelect={handleTrackSelect} />
              {selectedTrack && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 ring-1 ring-foreground/10">
                  <img
                    src={selectedTrack.albumImage}
                    alt={`Album art for ${selectedTrack.name}`}
                    className="size-11 rounded-md bg-muted object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {selectedTrack.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {selectedTrack.artist}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="transition ease-in"
              >
                Cancel
              </Button>
            </DialogClose>
            <SpinnerButton
              type="submit"
              isLoading={createRequestMutation.isPending}
              loadingText="Sending..."
              variant="default"
              className="transition ease-in"
              disabled={!selectedTrack || createRequestMutation.isPending}
            >
              Send Request
            </SpinnerButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDialogAdmin;
