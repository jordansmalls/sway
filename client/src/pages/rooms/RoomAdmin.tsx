import { useRoomDetailsQuery } from '../../api';
import { useCurrentUserQuery } from '../../api/users';
import { useParams, Navigate } from 'react-router-dom';

const RoomAdmin = () => {
  const { roomCode: rawRoomCode } = useParams<{ roomCode: string }>();
  const roomCode = rawRoomCode?.toUpperCase() ?? '';

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

  if (roomLoading || userLoading)
    return <p className="p-8 text-muted-foreground">Loading...</p>;
  if (roomError || userError)
    return <p className="p-8 text-destructive">Something went wrong.</p>;
  if (!roomData || !userData)
    return <p className="p-8 text-muted-foreground">Loading...</p>;

  const room = roomData.roomDetails;
  const user = userData.user;

  if (room.roomCreator?.toString() !== user._id?.toString()) {
    return <Navigate to="/not-room-owner" replace />;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">{room.roomName}</h1>
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
    </div>
  );
};

export default RoomAdmin;