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
import { Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '@/api/client';
import { useDeleteRoomMutation } from '@/api/rooms';
import { useAuthStore } from '@/stores/auth-store';

interface DeleteRoomDialogProps {
  roomCode: string;
  roomId?: string;
  roomName?: string;
  onRoomDeleted?: () => void;
  variant?:
    | 'destructive'
    | 'default'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  triggerClassName?: string;
  triggerChildren?: React.ReactNode;
  loadingText?: string;
  title?: string;
  description?: string;
}

const DeleteRoomDialog: React.FC<DeleteRoomDialogProps> = ({
  roomCode,
  roomId,
  roomName,
  onRoomDeleted,
  variant = 'destructive',
  size = 'sm',
  triggerClassName,
  triggerChildren = <Trash2 />,
  loadingText = 'Deleting...',
  title = 'Are you absolutely sure?',
  description = 'This action cannot be undone. This will permanently delete the room and all associated data.',
}) => {
  const user = useAuthStore((state) => state.user);
  const deleteRoomMutation = useDeleteRoomMutation();
  const [open, setOpen] = useState(false);

  const handleDeleteRoom = async () => {
    if (!user?._id) {
      toast.error("Something went wrong.", { description: "You are not authorized to delete this room." })
      return;
    }

    try {
      await deleteRoomMutation.mutateAsync({
        roomId: roomId || roomCode,
        userId: user._id,
      });

      toast.success('Deletion Complete', {
        description: `${roomName} is gone for good.`,
      });

      // Close the dialog
      setOpen(false);

      // Call the optional callback
      if (onRoomDeleted) {
        onRoomDeleted();
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={triggerClassName}>
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
            <Button
              variant="outline"
              type="button"
              disabled={deleteRoomMutation.isPending}
              className="transition ease-in"
            >
              Cancel
            </Button>
          </DialogClose>

          <SpinnerButton
            variant="destructive"
            onClick={handleDeleteRoom}
            isLoading={deleteRoomMutation.isPending}
            loadingText={loadingText}
            type="button"
            className="transition ease-in"
          >
            Confirm
          </SpinnerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteRoomDialog;
