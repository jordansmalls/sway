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


import { AppSidebar } from '../../components/sidebar/app-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '../../components/ui/breadcrumb';
import { Separator } from '../../components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../../components/ui/sidebar';
import NotFound from '../def/NotFound';


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
            <Separator
              orientation="vertical"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{room.roomName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              {room.roomName}
            </h1>
            <p className="text-muted-foreground mt-1">{room.roomDescription}</p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Room code
            </span>
            <span className="font-mono text-lg">{room.roomCode}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              QR code
            </span>
            <img
              src={room.roomQr}
              alt="Room QR Code"
              className="w-48 h-48 rounded-lg border"
            />
          </div>

          {/* edit room dialog */}
          <div>
            <EditRoomDialog variant="default" roomData={room} />
          </div>

          {/* share button w/ dialog  */}
          <div className="w-1/2">
            <ShareDialog roomCode={rawRoomCode || ''} roomData={room} />
          </div>

          {/* end room dialog */}
          <EndRoomDialog
            variant="destructive"
            roomId={roomData.roomDetails._id}
            loadingText="Please wait"
          />

          {/* spotify search */}
          <div>
            <RequestDialogAdmin
              roomId={room._id}
              triggerText="Add Song to Request List"
              requestedBy={user.username ?? user.email}
            />
          </div>

          {/*  request list admin */}
          <div>
            <RequestListAdmin />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default RoomAdmin;
