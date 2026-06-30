import { CreateRoomForm } from '../../components/forms/rooms/create-room-form';

export default function CreateRoom() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/dashboard" className="flex items-center gap-2 self-center font-black tracking-tighter">
          Sway
        </a>
        <CreateRoomForm />
      </div>
    </div>
  );
}
