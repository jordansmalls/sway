import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
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
  const [isOpen, setIsOpen] = useState(false);
  const createRequestMutation = useCreateRequestMutation();

  const handleTrackSelect = (track: SpotifySearchTrack) => {
    setSelectedTrack(track);
  };

  const createRequest = async () => {
    if (!selectedTrack) {
      toast.error("Oops! Something went wrong.", { description: "Please select a song before submitting your request." })
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

      toast.success("Success!", { description: `${selectedTrack.name} by ${selectedTrack.artist} has been added to the queue.` })

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
              Find the song you want to request by searching Spotify&apos;s
              catalog. You may also add your name to the request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label>Search for a Song</Label>
              <SpotifySearch onTrackSelect={handleTrackSelect} />
              {selectedTrack && (
                <div className="flex items-center gap-3 p-3 bg-background/40 rounded-lg border">
                  <img
                    src={selectedTrack.albumImage}
                    alt={`Album art for ${selectedTrack.name}`}
                    className="w-12 h-12 rounded-lg object-cover"
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
