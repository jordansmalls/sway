import { useState } from 'react';
import { useDemoSession } from '@/components/demo/demo-context';
import { Button } from '@/components/ui/button';
import { PulsatingButton } from '@/registry/magicui/pulsating-button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '../../lib/utils';
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
  classes: string;
  triggerIcon?: React.ReactNode;
  pulsating?: boolean;
}

const RequestDialog = ({ roomId, triggerText, classes, triggerIcon, pulsating = false }: RequestDialogProps) => {
  const [selectedTrack, setSelectedTrack] = useState<SpotifySearchTrack | null>(null);
  const demo = useDemoSession();
  const [requestedBy, setRequestedBy] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const createRequestMutation = useCreateRequestMutation();

  const handleTrackSelect = (track: SpotifySearchTrack) => {
    setSelectedTrack(track);
  };

  const createRequest = async () => {
    if (!selectedTrack) {
      toast.error("Oops! You didn't pick a song.", { description: "Please select a song before attempting to send off your request." })
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        roomId,
        requestedBy: requestedBy.trim() || undefined,
        track: createRequestTrackFromSpotifyTrack(selectedTrack),
      });

      setIsOpen(false);
      setSelectedTrack(null);
      setRequestedBy('');
      toast.success('Request sent!', {
        description: `${selectedTrack.name} by ${selectedTrack.artist} has been added to the queue.`,
      });
    } catch (error) {
      toast.error("Oops! Your request couldn't be processed.", {
        description: getApiErrorMessage(error, 'Please try again in a moment.'),
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
      setRequestedBy('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {pulsating ? (
          <PulsatingButton variant="ripple" distance="10px" className={cn(classes)}>
            {triggerIcon}
            {triggerText}
          </PulsatingButton>
        ) : (
        <Button variant="default" className={cn(classes)}>
          {triggerIcon}
          {triggerText}
        </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request a Track</DialogTitle>
            <DialogDescription>
              {demo ? "Search Spotify and add a song to your private demo queue. No Spotify login needed." : "Search Spotify's catalog and request a song. Add your name if you'd like the DJ to know it's from you."}
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

            <div className="grid gap-3">
              <Label htmlFor="requestedBy">Include Your Name? (Optional)</Label>
              <Input
                id="requestedBy"
                name="requestedBy"
                placeholder="Enter name or nickname"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                maxLength={50}
              />
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

export default RequestDialog;
