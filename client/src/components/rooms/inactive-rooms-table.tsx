import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

import { TracklistExportDropdown } from '../dropdowns/tracklist-export-dropdown';
import DeleteRoomDialog from '../dialogs/delete-room-dialog';
import { exportRequestsJson } from '@/api/exports';
import { getApiErrorMessage } from '@/api/client';
import { useInactiveRoomsQuery } from '@/api/users';
import { useAuthStore } from '@/stores/auth-store';

const InactiveRoomsTable = () => {
  const user = useAuthStore((state) => state.user);
  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    isError,
    refetch,
  } = useInactiveRoomsQuery(user?._id ?? '');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const inactiveRooms = useMemo(() => {
    return [...(roomsData?.inactiveRooms ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [roomsData]);

  const downloadFile = (data: Blob | string, filename: string, type: string) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const getSafeFilename = (name: string) =>
    name.trim().replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') ||
    'room';

  const handleExportRequests = async (roomCode: string, roomName: string) => {
    setExportingId(roomCode);
    try {
      const data = await exportRequestsJson(roomCode);
      downloadFile(
        JSON.stringify(data, null, 2),
        `${getSafeFilename(roomName)}_requests.json`,
        'application/json'
      );
      toast.success('Success!', {
        description: `You have successfully exported the requests for the ${roomName} room.`,
      });
    } catch (error) {
      toast.error('Oops! Something went wrong!', {
        description: getApiErrorMessage(
          error,
          "We're having trouble exporting the requests for this room, please try again."
        ),
      });
    } finally {
      setExportingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingRooms)
    return <div className="p-6 text-muted-foreground">Loading rooms...</div>;

  if (!user?._id) {
    return (
      <div className="p-6 text-muted-foreground">
        Sign in to view your inactive rooms.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-destructive">
        Unable to load inactive rooms.
      </div>
    );
  }

  return (
    <div className="p-6">

      {inactiveRooms.length === 0 ? (
        <p className="text-muted-foreground text-center">You currently have no inactive rooms!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-border rounded-lg">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Room Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inactiveRooms.map((room) => (
                <tr
                  key={room._id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">
                      {room.roomName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {room.roomDescription}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded">
                      {room.roomCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(room.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <TracklistExportDropdown
                        roomId={room._id}
                        roomName={room.roomName}
                        variant="outline"
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleExportRequests(room.roomCode, room.roomName)
                        }
                        disabled={exportingId === room.roomCode}
                      >
                        {exportingId === room.roomCode
                          ? '...'
                          : 'Export Requests'}
                      </Button>

                      <DeleteRoomDialog
                        roomCode={room.roomCode}
                        roomId={room._id}
                        roomName={room.roomName}
                        onRoomDeleted={() => void refetch()}
                        size={'sm'}
                        variant="destructive"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InactiveRoomsTable;
