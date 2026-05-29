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



interface ShareDialogProps {
  roomCode: string;
  roomData: object;
}

export function ShareDialog({ roomCode, roomData }: ShareDialogProps) {
  //! change for prod
  // let shareLink = `https://www.app.sway.onl/room/${roomCode}`
  const shareLink = `http://localhost:4321/room/${roomCode}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="transition ease-in">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Anyone who has this link will be able to join this room. Scan the QR
            live or download it to share easily.
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
          <RoomQrCodeAdmin
            size={250}
            qrDataUrl={roomData?.roomQr}
            filename={`${roomData?.roomName}-QR-Code`}
          />
        </div>
        <DialogFooter className="sm:justify-start">
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
