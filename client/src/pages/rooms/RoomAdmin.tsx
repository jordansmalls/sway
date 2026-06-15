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
import { SquareArrowOutUpRight } from 'lucide-react';



import { AppSidebar } from '../../components/sidebar/app-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '../../components/ui/breadcrumb';
import { Separator } from '../../components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../../components/ui/sidebar';
import NotFound from '../def/NotFound';
import RoomStatusBadge from '../../components/rooms/room-status-badge';


const RoomAdmin = () => {
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
      navigate('/dashboard');
    });

    return () => {
      leaveRoom();
      unsubscribeUpdated();
      unsubscribeEnded();
    };
  }, [navigate, queryClient, room?._id, roomCode]);

  const guestClick = () => {
    navigate(`/room/${roomCode}`)
  }

  if (roomLoading || userLoading)
    return <p className="p-8 text-muted-foreground">Loading...</p>;
  if (roomError || userError)
  return (
    <NotFound />
  )
  if (!room || !user)
    return <p className="p-8 text-muted-foreground">Loading...</p>;

  const roomCreatorId =
    typeof room.roomCreator === 'string'
      ? room.roomCreator
      : room.roomCreator?._id;

  if (roomCreatorId !== user._id) {
    return <Navigate to="/not-room-owner" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-bold lg:font-bold lg:text-2xl tracking-tight">
                    {room.roomName}
                  </BreadcrumbPage>
                  <RoomStatusBadge active={room.active} />
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* <section className="max-w-2xl px-6 py-10 flex flex-col gap-2"> */}
          <section className="max-w-2xl px-6 py-2 flex flex-col gap-2">
          {/* <div>
            <h1 className="font-medium tracking-tighter text-lg">
              {room.roomName}
            </h1>
            <p className="text-muted-foregroundn tracking-tight">
              {room.roomDescription}
            </p>
          </div> */}

          <div className="flex gap-2">
            <div>
              <EditRoomDialog variant="outline" roomData={room} />
            </div>
            <Button
              variant={'outline'}
              onClick={guestClick}
              className="text-xs transition ease-in"
            >
              <SquareArrowOutUpRight />
              View Room
            </Button>
            <ShareDialog roomCode={rawRoomCode || ''} roomData={room} />
            <EndRoomDialog
              variant="destructive"
              roomId={roomData.roomDetails._id}
              loadingText="Please wait"
              triggerClassName="text-xs"
            />
            <div>
              <RequestDialogAdmin
                roomId={room._id}
                triggerText="Add Song to Request List"
                requestedBy={user.username ?? user.email}
              />
            </div>
          </div>
          <RequestListAdmin />
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default RoomAdmin;
