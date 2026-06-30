import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';

interface RoomEndedProps {
  roomCode?: string;
  roomName?: string;
}


const RoomEnded: React.FC<RoomEndedProps> = ({ roomCode, roomName }) => {
  const navigate = useNavigate();
  const { roomCode: routeRoomCode } = useParams<{ roomCode: string }>();
  const tracklistRoomCode = roomCode ?? routeRoomCode ?? '';

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="https://www.sway.onl"
          className="flex items-center gap-2 self-center font-medium"
          target="_blank"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-black tracking-tighter">
            <svg
              width="12"
              height="12"
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
          </div>
        </a>

        <section className="text-center">
          <h1 className="font-semibold text-4xl tracking-tight mb-4">
            The Room is Over!
          </h1>
          <p className="mb-4 text-foreground/80">
            We hope you enjoyed {roomName}, with Sway!
          </p>
          <Button
            onClick={() => navigate(`/${tracklistRoomCode}/tracklist`)}
            disabled={!tracklistRoomCode}
            className="transition duration-300 px-3 py-5 w-full text-lg tracking-tight font-normal"
          >
            View Tracklist
          </Button>
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/join-room')}
              className="text-sm text-foreground/80 transition duration-300 hover:text-primary hover:cursor-pointer"
            >
              Join Another Room?
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
export default RoomEnded;
