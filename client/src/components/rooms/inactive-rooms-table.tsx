import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Circle, Clock3, MoreHorizontal, Search, SquarePen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/api/client';
import { exportRequestsJson } from '@/api/exports';
import { useActiveRoomSummaryQuery } from '@/api/rooms';
import { useInactiveRoomsQuery } from '@/api/users';
import { useAuthStore } from '@/stores/auth-store';
import DeleteRoomDialog from '../dialogs/delete-room-dialog';
import { EditRoomDialog } from '../dialogs/edit-room-dialog';
import { TracklistExportDropdown } from '../dropdowns/tracklist-export-dropdown';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const PAGE_SIZES = [5, 10, 20];

type RoomStatus = 'in-progress' | 'completed' | 'scheduled';

const getRoomStatus = (room: { active: boolean; scheduledAt?: string | null }): RoomStatus => {
  if (room.scheduledAt && new Date(room.scheduledAt).getTime() > Date.now()) return 'scheduled';
  return room.active ? 'in-progress' : 'completed';
};

const RoomStatusCell = ({ status }: { status: RoomStatus }) => {
  if (status === 'in-progress') return <span className="inline-flex items-center gap-2 font-medium text-cyan-500"><Circle className="size-3 fill-current" />In Progress</span>;
  if (status === 'scheduled') return <span className="inline-flex items-center gap-2 font-medium text-amber-500"><Clock3 className="size-4" />Scheduled</span>;
  return <span className="inline-flex items-center gap-2 font-medium text-emerald-500"><Check className="size-4" />Completed</span>;
};

const InactiveRoomsTable = () => {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError, refetch } = useInactiveRoomsQuery(user?._id ?? '');
  const { data: activeData, isLoading: isLoadingActive, isError: isActiveError, refetch: refetchActive } = useActiveRoomSummaryQuery({ enabled: Boolean(user?._id) });
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activeRoom = activeData?.activeRoom
      ? [{ ...activeData.activeRoom, requestsTotal: activeData.activeRoom.requestsReceived }]
      : [];
    return [...activeRoom, ...(data?.inactiveRooms ?? [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((room) =>
        [room.roomName, room.roomDescription, room.roomCode].some((value) =>
          value.toLowerCase().includes(query)
        )
      );
  }, [activeData, data, search]);

  const pageCount = Math.max(1, Math.ceil(rooms.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRooms = rooms.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstResult = rooms.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastResult = Math.min(currentPage * pageSize, rooms.length);

  const handleExportRequests = async (roomCode: string, roomName: string) => {
    setExportingId(roomCode);
    try {
      const exported = await exportRequestsJson(roomCode);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${roomName.trim().replace(/[^a-z0-9-_]+/gi, '_') || 'room'}_requests.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Requests exported', { description: `${roomName}'s requests are ready.` });
    } catch (error) {
      toast.error('Unable to export requests', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setExportingId(null);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' });

  if (isLoading || isLoadingActive) return <div className="p-6 text-muted-foreground">Loading rooms...</div>;
  if (!user?._id) return <div className="p-6 text-muted-foreground">Sign in to view your inactive rooms.</div>;
  if (isError || isActiveError) return <div className="p-6 text-destructive">Unable to load rooms.</div>;

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search rooms..." aria-label="Search past rooms" className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                {['Room', 'Code', 'Status', 'Created', 'Play rate', 'Progress'].map((label) => (
                  <th key={label} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{label}</th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRooms.map((room) => (
                <tr key={room._id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="max-w-64 text-sm font-medium">{room.roomName}</div>
                    <div className="max-w-64 truncate text-xs text-muted-foreground">{room.roomDescription}</div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge className="h-5 border-transparent bg-[#510424] px-2 font-mono text-[10px] leading-none text-[#FB64B6] dark:bg-[#510424] dark:text-[#FB64B6]">{room.roomCode}</Badge>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm"><RoomStatusCell status={getRoomStatus(room)} /></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(room.createdAt)}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-semibold tabular-nums text-emerald-500">{room.requestsTotal === 0 ? 0 : Math.round((room.requestsPlayed / room.requestsTotal) * 100)}%</span>
                  </td>
                  <td className="min-w-40 px-5 py-4">
                    <Progress value={room.requestsTotal === 0 ? 0 : Math.round((room.requestsPlayed / room.requestsTotal) * 100)} indicatorClassName="bg-blue-500" aria-label={`${room.roomName} play progress`} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <TracklistExportDropdown roomId={room._id} roomName={room.roomName} variant="outline" triggerClassName="h-7 px-2 text-xs" />
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleExportRequests(room.roomCode, room.roomName)} disabled={exportingId === room.roomCode}>
                        {exportingId === room.roomCode ? '...' : 'Export Requests'}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Actions for ${room.roomName}`}><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <EditRoomDialog roomData={room} trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()}><SquarePen />Edit room</DropdownMenuItem>} />
                          <DeleteRoomDialog roomCode={room.roomCode} roomId={room._id} roomName={room.roomName} onRoomDeleted={() => { void refetch(); void refetchActive(); }} trigger={<DropdownMenuItem variant="destructive" onSelect={(event) => event.preventDefault()}><Trash2 />Delete room</DropdownMenuItem>} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRooms.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-14 text-center text-sm text-muted-foreground">{search ? 'No rooms match your search.' : 'You currently have no rooms!'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Showing {firstResult} to {lastResult} of {rooms.length} rooms</span>
            <label className="flex items-center gap-2">
              Rows per page
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger className="w-20" aria-label="Rows per page"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
              </Select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={currentPage === 1} aria-label="First page"><ChevronsLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft /></Button>
            <span className="min-w-14 text-center text-sm tabular-nums">{currentPage} / {pageCount}</span>
            <Button variant="outline" size="icon" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight /></Button>
            <Button variant="outline" size="icon" onClick={() => setPage(pageCount)} disabled={currentPage === pageCount} aria-label="Last page"><ChevronsRight /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactiveRoomsTable;
