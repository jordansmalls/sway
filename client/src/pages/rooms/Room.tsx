import { SwayLogo } from '@/components/sway-logo';
import React, { useEffect, useState } from 'react';
import { useDemoSession } from '@/components/demo/demo-context';
import { AnimatedThemeToggler } from '@/registry/magicui/animated-theme-toggler';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShareDialog } from '../../components/dialogs/share-dialog';
import { roomKeys, useRoomDetailsQuery } from '@/api/rooms';
import { removeRequestFromRoomCache, requestKeys, upsertRequestInRoomCache } from '@/api/requests';
import RoomEnded from './RoomEnded';
import Footer from '../../components/footer';
import RequestList from '../../components/rooms/request-list';
import MakeRequest from '../../components/rooms/make-request';
import NowPlaying from '../../components/rooms/now-playing';
import { joinRoom, onRequestCreated, onRequestDeleted, onRequestPlayed, onRequestPlaying, onRequestUpdated, onRoomEnded, onRoomUpdated } from '@/lib/socket';

const Room: React.FC = () => {
  const demo = useDemoSession();
  const { roomCode: rawRoomCode } = useParams();
  const roomCode = rawRoomCode ? rawRoomCode.toUpperCase() : '';
  const [roomEnded, setRoomEnded] = useState(false);
  const queryClient = useQueryClient();
  const roomQuery = useRoomDetailsQuery(roomCode);
  const roomData = roomQuery.data?.roomDetails;
  const roomId = roomData?._id ?? '';

  useEffect(() => {
    if (!roomId) return;
    const invalidateRoom = () => queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomCode) });
    const invalidateRequests = () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.byRoom(roomId) });
      queryClient.invalidateQueries({ queryKey: roomKeys.requests(roomCode) });
    };
    const syncRequest = (request: Parameters<typeof upsertRequestInRoomCache>[1]) => {
      upsertRequestInRoomCache(queryClient, request);
      invalidateRequests();
    };
    const leaveRoom = joinRoom(roomId);
    const unsubscribeRoomUpdated = onRoomUpdated(({ roomId: eventRoomId }) => eventRoomId === roomId && invalidateRoom());
    const unsubscribeRoomEnded = onRoomEnded(({ roomId: eventRoomId }) => {
      if (eventRoomId !== roomId) return;
      setRoomEnded(true);
      invalidateRoom();
    });
    const unsubscribeCreated = onRequestCreated(({ roomId: eventRoomId, request }) => eventRoomId === roomId && syncRequest(request));
    const unsubscribeUpdated = onRequestUpdated(({ roomId: eventRoomId, request }) => eventRoomId === roomId && syncRequest(request));
    const unsubscribeDeleted = onRequestDeleted(({ requestId }) => {
      removeRequestFromRoomCache(queryClient, roomId, requestId);
      invalidateRequests();
    });
    const unsubscribePlaying = onRequestPlaying(({ roomId: eventRoomId, request }) => eventRoomId === roomId && syncRequest(request));
    const unsubscribePlayed = onRequestPlayed(({ roomId: eventRoomId, request }) => eventRoomId === roomId && syncRequest(request));
    return () => {
      leaveRoom();
      unsubscribeRoomUpdated(); unsubscribeRoomEnded(); unsubscribeCreated(); unsubscribeUpdated();
      unsubscribeDeleted(); unsubscribePlaying(); unsubscribePlayed();
    };
  }, [queryClient, roomCode, roomId]);

  if (roomEnded || roomData?.active === false) return <RoomEnded roomCode={roomCode} roomName={roomData?.roomName} />;
  if (roomQuery.isLoading) return <p className="p-8 text-center text-sm text-muted-foreground">Loading room…</p>;
  if (roomQuery.isError || !roomData) return <p className="p-8 text-center text-sm text-destructive">Room could not be loaded.</p>;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-primary/[0.055] via-background to-background dark:bg-background dark:bg-none">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 sm:px-6 sm:pb-12">
        <header className="flex h-16 items-center justify-between sm:h-20">
          <a href={demo ? '/demo' : '/'} className="flex items-center gap-2" aria-label="Sway home">
            <SwayLogo className="h-6" />
          </a>
          <div className="flex items-center gap-2">
            <AnimatedThemeToggler className="size-11 rounded-full" />
            <ShareDialog roomCode={roomData.roomCode} roomData={roomData} triggerClassName="h-11 min-w-11 rounded-full bg-background/80 px-3 shadow-sm backdrop-blur" />
          </div>
        </header>

        <main>
          <section className="pb-6 pt-5 text-center sm:pb-9 sm:pt-8">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 shadow-xs backdrop-blur">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/15" />
              <span className="text-xs font-medium text-muted-foreground">{demo ? 'Demo Room' : 'Live Room'}</span>
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tighter sm:text-5xl">{roomData.roomName}</h1>
            {roomData.roomDescription && <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base">{roomData.roomDescription}</p>}
          </section>

          <div className="space-y-5 sm:space-y-7">
            <MakeRequest roomId={roomData._id} triggerText="Request a song" />
            <NowPlaying roomId={roomId} />
            <section aria-labelledby="request-queue-heading">
              <div className="mb-3 space-y-1 px-1">
                <h2 id="request-queue-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">Request queue</h2>
                <p className="text-xs text-muted-foreground">Vote for your favorite!</p>
              </div>
              <RequestList roomId={roomData._id} />
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Room;
