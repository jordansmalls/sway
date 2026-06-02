import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface RoomEndedProps {
  roomCode?: string;
}

const RoomEnded: React.FC<RoomEndedProps> = ({ roomCode }) => {
  const navigate = useNavigate();
  const { roomCode: routeRoomCode } = useParams<{ roomCode: string }>();
  const tracklistRoomCode = roomCode ?? routeRoomCode ?? '';

  return (
    <div className="flex flex-col min-h-screen bg-white relative isolate">
      {/* Background element */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl"
      >
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="mx-auto aspect-1155/678 w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>

      {/* Content */}
      <div className="flex-grow flex justify-center items-center flex-col">
        <div className="w-full max-w-md p-8 text-center">
          <h1 className="text-4xl mb-4 font-bold leading-tight tracking-tight text-gray-900">
            Party Over!
          </h1>
          <p className="text-sm text-gray-600 text-center mb-8">
            The room has now ended, thank you for joining. If you enjoyed Sway,
            please share with a friend!
          </p>

          {/* View Tracklist */}
          <button
            onClick={() => navigate(`/${tracklistRoomCode}/tracklist`)}
            disabled={!tracklistRoomCode}
            className="w-full text-white bg-black hover:bg-[dodgerblue] focus:ring-4 focus:outline-none focus:ring-indigo-600 font-medium rounded-full text-lg px-5 py-3 text-center transition flex items-center justify-center mb-4 duration-300"
          >
            View Tracklist
          </button>

          {/* Join Another Room */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/join-room')}
              className="text-sm text-gray-600 transition duration-300 hover:text-[dodgerblue]"
            >
              Join Another Room?
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500 mt-auto">
        <p>© {new Date().getFullYear()} Sway. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default RoomEnded;
