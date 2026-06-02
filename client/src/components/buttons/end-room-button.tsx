import React from 'react';
import { SpinnerButton } from './spinner-button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/client';
import { useEndRoomMutation, useRoomDetailsQuery } from '@/api/rooms';

interface EndRoomButtonProps {
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
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  loadingText?: string;
  redirectAfterEnd?: string;
}

const EndRoomButton: React.FC<EndRoomButtonProps> = ({
  roomCode,
  roomId,
  onRoomEnded,
  variant = 'destructive',
  size = 'default',
  className,
  children = 'End Room',
  loadingText = 'Ending...',
  redirectAfterEnd,
}) => {
  const endRoomMutation = useEndRoomMutation();
  const roomDetailsQuery = useRoomDetailsQuery(roomCode ?? '');
  const navigate = useNavigate();
  const normalizeRoomId = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    return trimmed;
  };
  const targetRoomId =
    normalizeRoomId(roomId) ??
    normalizeRoomId(roomDetailsQuery.data?.roomDetails._id);
  const isLoading = endRoomMutation.isPending || roomDetailsQuery.isLoading;

  const handleEndRoom = async () => {
    if (!roomCode && !roomId) {
      toast.error("Something went wrong.", { description: "Room code or room ID is required." })
      return;
    }

    try {
      let resolvedRoomId = targetRoomId;

      // If caller only has roomCode and details are stale/not ready, fetch now.
      if (!resolvedRoomId && roomCode) {
        const freshRoom = await roomDetailsQuery.refetch();
        resolvedRoomId = normalizeRoomId(freshRoom.data?.roomDetails?._id);
      }

      if (!resolvedRoomId) {
        toast.error("Something went wrong.", { description: "We couldn't find the room to end, please try again." })
        return;
      }

      await endRoomMutation.mutateAsync({ roomId: resolvedRoomId });

      toast.success('The party is now over!', {
        description:
          'Room ended successfully and all participants have been disconnected.',
      });

      // Call the optional callback
      if (onRoomEnded) {
        onRoomEnded();
      }

      // Redirect if specified
      if (redirectAfterEnd) {
        navigate(redirectAfterEnd);
      }
    } catch (err) {
      console.error('Error ending room:', err);
      toast.error("Oops! Something went wrong.", { description: "We're having trouble ending your room, please try again." })
    }
  };

  return (
    <SpinnerButton
      variant={variant}
      size={size}
      onClick={handleEndRoom}
      isLoading={isLoading}
      loadingText={loadingText}
      className={className}
    >
      {children}
    </SpinnerButton>
  );
};

export default EndRoomButton;
