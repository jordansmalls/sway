import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { SpinnerButton } from '../buttons/spinner-button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/client';
import { useEndRoomMutation, useRoomDetailsQuery } from '@/api/rooms';

interface EndRoomDialogProps {
  roomCode?: string;
  roomId?: string;
  onRoomEnded?: () => void;
  variant?:
    | 'destructive'
    | 'default'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'outline';
  triggerClassName?: string;
  triggerChildren?: React.ReactNode;
  loadingText?: string;
  redirectAfterEnd?: string;
  title?: string;
  description?: string;
}

const EndRoomDialog: React.FC<EndRoomDialogProps> = ({
  roomCode,
  roomId,
  onRoomEnded,
  variant = 'destructive',
  triggerClassName,
  triggerChildren = 'End Room',
  loadingText = 'Ending...',
  redirectAfterEnd,
  title = 'Are you sure you want to end this room?',
  description = 'This action cannot be undone. All participants will be disconnected and the room will be permanently closed.',
}) => {
  const endRoomMutation = useEndRoomMutation();
  const roomDetailsQuery = useRoomDetailsQuery(roomCode ?? '');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const normalizeRoomId = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    return trimmed;
  };
  const targetRoomId = normalizeRoomId(roomId) ?? normalizeRoomId(roomDetailsQuery.data?.roomDetails._id);
  const isLoading = endRoomMutation.isPending || roomDetailsQuery.isLoading;

  const handleEndRoom = async () => {
    if (!roomCode && !roomId) {
      toast.error("Oops! Something went wrong.", { description: "Room code or Room ID is required." })
      return;
    }

    try {
      let resolvedRoomId = targetRoomId;

      // If caller provided a room code but no usable room id, fetch fresh details first.
      if (!resolvedRoomId && roomCode) {
        const freshRoom = await roomDetailsQuery.refetch();
        resolvedRoomId = normalizeRoomId(freshRoom.data?.roomDetails?._id);
      }

      if (!resolvedRoomId) {
        toast.error("Oops! Something went wrong.", { description: "We could not find the room to end, please try again." })
        return;
      }

      await endRoomMutation.mutateAsync({ roomId: resolvedRoomId });

      toast.success('The party is now over!', {
        description:
          'Room ended successfully and all participants have been disconnected.',
      });

      // Close the dialog
      setOpen(false);

      // Call the optional callback
      if (onRoomEnded) {
        onRoomEnded();
      }

      // Redirect if specified
      if (redirectAfterEnd) {
        navigate(redirectAfterEnd);
      }
    } catch (err) {
      console.error('There was an error ending the room:', err);
      toast.error("Something went wrong.", { description: `${getApiErrorMessage(err), "Oops!"}`})
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={triggerClassName}>
          {triggerChildren}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>

          <SpinnerButton
            variant="destructive"
            onClick={handleEndRoom}
            isLoading={isLoading}
            loadingText={loadingText}
            type="button"
          >
            Confirm
          </SpinnerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EndRoomDialog;
