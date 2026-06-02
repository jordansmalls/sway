import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RoomQrCodeAdmin from './room-qr-code-admin';
import type { Room } from '@/api/types';
import { Share } from 'lucide-react';


interface ShareDialogProps {
  roomCode: string;
  roomData: Room;
}

export function ShareDialog({ roomCode, roomData }: ShareDialogProps) {
  //! change for prod
  // let shareLink = `https://www.app.sway.onl/room/${roomCode}`
  const shareLink = `http://localhost:4321/room/${roomCode}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="transition ease-in">
          {/* Share */}
          <Share />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Link to Room</DialogTitle>
          <DialogDescription>
            Anyone who has this link will be able to join this room. You can
            also scan the QR live or download it to share easily.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input id="link" defaultValue={shareLink} readOnly />
          </div>
        </div>

        <div>
          {roomData.roomQr ? (
            <RoomQrCodeAdmin
              size={250}
              qrDataUrl={roomData.roomQr}
              filename={`${roomData.roomName}-QR-Code`}
            />
          ) : null}
        </div>

        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="transition ease-in"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
