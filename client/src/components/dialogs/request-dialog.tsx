import { useState } from 'react';
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
}

const RequestDialog = ({ roomId, triggerText, classes }: RequestDialogProps) => {
  const [selectedTrack, setSelectedTrack] = useState<SpotifySearchTrack | null>(null);
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
        {/* <Button variant="default">Make Request</Button> */}
        <Button variant="default" className={cn(classes)}>{triggerText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
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
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                  <img
                    src={selectedTrack.albumImage}
                    alt={`Album art for ${selectedTrack.name}`}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {selectedTrack.name}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
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
