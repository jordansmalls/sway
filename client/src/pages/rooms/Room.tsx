import React, { useEffect, useState } from 'react';
import { ShareDialog } from '../../components/dialogs/share-dialog';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { roomKeys, useRoomDetailsQuery } from '@/api/rooms';
import {
  removeRequestFromRoomCache,
  requestKeys,
  upsertRequestInRoomCache,
} from '@/api/requests';
import RoomEnded from './RoomEnded';
import Footer from '../../components/footer';
import RequestList from '../../components/rooms/request-list';
import MakeRequest from '../../components/rooms/make-request';
import NowPlaying from '../../components/rooms/now-playing';
import {
  joinRoom,
  onRequestCreated,
  onRequestDeleted,
  onRequestPlayed,
  onRequestPlaying,
  onRequestUpdated,
  onRoomEnded,
  onRoomUpdated,
} from '@/lib/socket';

const Room: React.FC = () => {
  const { roomCode: rawRoomCode } = useParams();
  const roomCode = rawRoomCode ? rawRoomCode.toUpperCase() : '';
  const [roomEnded, setRoomEnded] = useState(false);
  const queryClient = useQueryClient();
  const roomQuery = useRoomDetailsQuery(roomCode);
  const roomData = roomQuery.data?.roomDetails;
  const roomId = roomData?._id ?? '';

  useEffect(() => {
    if (!roomId) return;

    const invalidateRoom = () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomCode) });
    };
    const invalidateRequests = () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.byRoom(roomId) });
      queryClient.invalidateQueries({ queryKey: roomKeys.requests(roomCode) });
    };
    const syncRequest = (request: Parameters<typeof upsertRequestInRoomCache>[1]) => {
      upsertRequestInRoomCache(queryClient, request);
      invalidateRequests();
    };

    const leaveRoom = joinRoom(roomId);

    const unsubscribeRoomUpdated = onRoomUpdated(({ roomId: eventRoomId }) => {
      if (eventRoomId === roomId) invalidateRoom();
    });
    const unsubscribeRoomEnded = onRoomEnded(({ roomId: eventRoomId }) => {
      if (eventRoomId !== roomId) return;

      setRoomEnded(true);
      invalidateRoom();
    });
    const unsubscribeCreated = onRequestCreated(({ roomId: eventRoomId, request }) => {
      if (eventRoomId !== roomId) return;

      syncRequest(request);
    });
    const unsubscribeUpdated = onRequestUpdated(({ roomId: eventRoomId, request }) => {
      if (eventRoomId === roomId) syncRequest(request);
    });
    const unsubscribeDeleted = onRequestDeleted(({ requestId }) => {
      removeRequestFromRoomCache(queryClient, roomId, requestId);
      invalidateRequests();
    });
    const unsubscribePlaying = onRequestPlaying(({ roomId: eventRoomId, request }) => {
      if (eventRoomId === roomId) syncRequest(request);
    });
    const unsubscribePlayed = onRequestPlayed(({ roomId: eventRoomId, request }) => {
      if (eventRoomId === roomId) syncRequest(request);
    });

    return () => {
      leaveRoom();
      unsubscribeRoomUpdated();
      unsubscribeRoomEnded();
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribePlaying();
      unsubscribePlayed();
    };
  }, [queryClient, roomCode, roomId]);

  if (roomEnded || roomData?.active === false) {
    return <RoomEnded roomCode={roomCode} roomName={roomData?.roomName} />;
  }

  if (roomQuery.isLoading) {
    return <p className="p-8 text-muted-foreground">Loading room...</p>;
  }

  if (roomQuery.isError || !roomData) {
    return <p className="p-8 text-destructive">Room could not be loaded.</p>;
  }

  return (
    <>
      <header className="flex flex-col place-items-center my-[1rem] mb-[2rem]">
        <div className='flex items-center gap-2'>

          <svg
            width="20"
            height="20"
            viewBox="0 0 42 42"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path="url(#clip0_47_23)">
              <path
                d="M20.7724 21.7681V21.2276H20.2319H6.17781V20.2095C13.0744 18.5019 18.5019 13.0744 20.2095 6.17781H21.2276V20.2319V20.7724H21.7681H35.8222V21.7905C28.9256 23.4981 23.4981 28.9256 21.7905 35.8222H20.7724V21.7681ZM1.54054 15.5946H1V16.1351V25.8649V26.4054H1.54054H15.5946V40.4595V41H16.1351H25.8649H26.4054V40.4595C26.4054 32.6977 32.6977 26.4054 40.4595 26.4054H41V25.8649V16.1351V15.5946H40.4595H26.4054V1.54054V1H25.8649H16.1351H15.5946V1.54054C15.5946 9.30232 9.30232 15.5946 1.54054 15.5946Z"
                fill="white"
                stroke="white"
              />
            </g>
            <defs>
              <clipPath id="clip0_47_23">
                <rect width="42" height="42" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <p className="font-black tracking-tighter">Sway</p>
        </div>
      </header>

      {/* main Room info */}
      <main>
        <div className="flex flex-col gap-[.2rem]">
          <h1 className="font-bold text-2xl lg:text-3xl text-center tracking-tighter">
            {roomData?.roomName}
          </h1>
          <p className="font-normal text-xs mx-[2.5rem] lg:text-lg text-center lg:mx-[30rem]">
            {roomData?.roomDescription}
          </p>
        </div>
      </main>

      {/* Room code info */}
      <section className="flex flex-col items-center justify-center mt-3">
        <p className="font-medium opacity-60 text-[.45rem] lg:text-[.67rem] mb-1">
          ROOM CODE
        </p>

        <div className="flex items-center">
          <h2 className="text-4xl font-semibold tracking-wide text-primary mr-2">
            {roomData.roomCode}
          </h2>
          <ShareDialog roomCode={roomData.roomCode} roomData={roomData} />
        </div>
      </section>

      {/* Make Request */}
      <div className="lg:mt-8 mt-4">
        <MakeRequest roomId={roomData._id} triggerText="Request a Song" />
      </div>

      <div>
        <NowPlaying roomId={roomId} />
      </div>

      {/* Request List */}
      <div>
        <h3 className="font-medium text-lg tracking-tighter mx-[2rem] mt-[2rem] text-center">
          Request Queue
        </h3>
        <RequestList roomId={roomData._id} />
      </div>

      <Footer />
    </>
  );
};

export default Room;
