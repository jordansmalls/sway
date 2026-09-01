import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { roomKeys, useRoomDetailsQuery } from '../../api';
import { useCurrentUserQuery } from '../../api/users';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ShareDialog } from '../../components/dialogs/share-dialog';
import { EditRoomDialog } from '../../components/dialogs/edit-room-dialog';
import EndRoomDialog from '../../components/dialogs/end-room-dialog';
import RequestDialogAdmin from '../../components/dialogs/request-dialog-admin';
import RequestListAdmin from '../../components/rooms/request-list-admin';
import { joinRoom, onRoomEnded, onRoomUpdated } from '@/lib/socket';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Folder, MonitorUp, SquareArrowOutUpRight } from 'lucide-react';



import { SidebarTrigger } from '../../components/ui/sidebar';
import NotFound from '../def/NotFound';
import RoomStatusBadge from '../../components/rooms/room-status-badge';
import { AppLoading } from '@/components/app-loading';
import { RecommendedTracks } from '@/components/rooms/recommended-tracks';
import { useDemoSession } from '@/components/demo/demo-context';
import { roomExperiencePath } from '@/lib/demo-session';


const RoomAdmin = () => {
  const demo = useDemoSession();
  const { roomCode: rawRoomCode } = useParams<{ roomCode: string }>();
  const roomCode = rawRoomCode?.toUpperCase() ?? '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: roomData,
    isLoading: roomLoading,
    isError: roomError,
  } = useRoomDetailsQuery(roomCode);
  const {
    data: userData,
    isLoading: userLoading,
    isError: userError,
  } = useCurrentUserQuery();

  const room = roomData?.roomDetails;
  const user = userData?.user;

  useEffect(() => {
    if (!room?._id) return;

    const leaveRoom = joinRoom(room._id);

    const unsubscribeUpdated = onRoomUpdated(({ roomId }) => {
      if (roomId !== room._id) return;

      queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomCode) });
    });

    const unsubscribeEnded = onRoomEnded(({ roomId }) => {
      if (roomId !== room._id) return;
      toast.info("Party's over.", { description: 'This room is now over, feel free to check out the tracklist.',  });
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomCode) });
      navigate(demo ? `/demo/${roomCode}/tracklist` : '/dashboard');
    });

    return () => {
      leaveRoom();
      unsubscribeUpdated();
      unsubscribeEnded();
    };
  }, [demo, navigate, queryClient, room?._id, roomCode]);

  const guestClick = () => {
    navigate(roomExperiencePath(`/room/${roomCode}`))
  }

  const displayClick = () => {
    if (demo) {
      navigate(roomExperiencePath(`/room/${roomCode}/display`));
      return;
    }
    window.open(`/room/${roomCode}/display`, '_blank', 'noopener,noreferrer');
  }

  if (roomLoading || userLoading)
    return <AppLoading label="Opening your room" className="min-h-[70vh]" />;
  if (roomError || userError)
  return (
    <NotFound />
  )
  if (!room || !user)
    return <AppLoading label="Opening your room" className="min-h-[70vh]" />;

  const roomCreatorId =
    typeof room.roomCreator === 'string'
      ? room.roomCreator
      : room.roomCreator?._id;

  if (roomCreatorId !== user._id) {
    return <Navigate to="/not-room-owner" replace />;
  }

  return (
    <>
        <header className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center bg-card">
          <div className="flex min-w-0 items-center gap-3 px-4 sm:px-6">
            <SidebarTrigger className="-ml-2 shrink-0" />
            <div className="flex min-w-0 items-center gap-2">
              <Folder className={`size-4 shrink-0 text-muted-foreground ${room.active ? "dark:text-icon-gold" : "dark:text-icon-gray"}`} />
              <span className="truncate text-sm font-semibold">{room.roomName}</span>
              <RoomStatusBadge active={room.active} />
            </div>
          </div>
        </header>

        <section className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-2 sm:px-6">
          <div className="flex w-full flex-wrap items-center gap-2">
            <EditRoomDialog variant="outline" roomData={room} />
            <Button
              variant="outline"
              size="sm"
              onClick={guestClick}
              className="shrink-0 text-xs"
            >
              <SquareArrowOutUpRight />
              <span className="hidden sm:inline">View Room</span>
              <span className="sr-only sm:hidden">View Room</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={displayClick}
              className="shrink-0 text-xs"
            >
              <MonitorUp />
              <span className="hidden sm:inline">Display</span>
              <span className="sr-only sm:hidden">Display room</span>
            </Button>
            <ShareDialog roomCode={rawRoomCode || ''} roomData={room} />
            <EndRoomDialog
              variant="destructive"
              roomId={roomData.roomDetails._id}
              loadingText="Please wait"
              redirectAfterEnd={demo ? `/demo/${roomCode}/tracklist` : undefined}
              description={demo ? 'This ends your demo room and opens its tracklist. You can reset the demo at any time while your session is active.' : undefined}
            />
            <RequestDialogAdmin
              roomId={room._id}
              triggerText="Add Song to Request List"
              requestedBy={user.username ?? user.email}
            />
          </div>
          <RecommendedTracks userId={user._id} />
          <RequestListAdmin />
        </section>
    </>
  );
};

export default RoomAdmin;
