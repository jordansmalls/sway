import { Button } from '@/components/ui/button';
import { SpinnerButton } from '../buttons/spinner-button';
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
import { useState, useEffect, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useUpdateRoomMutation } from '@/api/rooms';
import type { Room } from '@/api/types';
import { useAuthStore } from '@/stores/auth-store';

interface EditRoomDialogProps {
  variant: React.ComponentProps<typeof Button>['variant'];
  roomData: Room;
}

export function EditRoomDialog({ variant, roomData }: EditRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [roomName, setRoomName] = useState(roomData.roomName);
  const [roomDescription, setRoomDescription] = useState(
    roomData.roomDescription
  );
  const user = useAuthStore((state) => state.user);
  const updateRoomMutation = useUpdateRoomMutation();
  const roomCreatorId =
    typeof roomData.roomCreator === 'string'
      ? roomData.roomCreator
      : roomData.roomCreator?._id;
  const isOwner = Boolean(user?._id && roomCreatorId === user._id);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setRoomName(roomData.roomName);
      setRoomDescription(roomData.roomDescription);
    }

    setOpen(nextOpen);
  };

  // Check auth (ownership)
  useEffect(() => {
    if (open && user && !isOwner) {
      toast.error('Oops! Edit access denied.', {
        description: "You're not authorized to make changes to this room.",
      });
    }
  }, [isOwner, open, user]);

  // Update handler
  const updateRoomHandler = async (e: FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      toast.error('Oops! Edit access denied.', {
        description: "You're not authorized to make changes to this room.",
      });
      return;
    }

    try {
      await updateRoomMutation.mutateAsync({
        roomId: roomData._id,
        roomName,
        roomDescription,
      });

      toast.success('Room updated successfully!', {
        description: 'Your changes have been saved.',
      });

      // close dialog
      setOpen(false);
    } catch (err) {
      console.error(err)
      toast.error("Oops! Something went wrong.", { description: "We're having trouble updating the room, please try again." })
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} className="transition ease-in">
          Edit Room
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={updateRoomHandler}>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update your room's name or description here. Click save when
              you’re done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="roomDescription">Room Description</Label>
              <Input
                id="roomDescription"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>

            <SpinnerButton
              isLoading={updateRoomMutation.isPending}
              loadingText="Updating"
              type="submit"
            >
              Update
            </SpinnerButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
