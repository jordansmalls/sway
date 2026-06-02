import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '../../ui/textarea';
import { toast } from 'sonner';
import { useState } from 'react';
import { useCreateRoomMutation } from '@/api/rooms';
import { useNavigate } from 'react-router-dom';

export function CreateRoomForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');

  const createRoom = useCreateRoomMutation();
  const navigate = useNavigate();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    createRoom.mutate(
      { roomName, roomDescription },
      {
        onSuccess: (data) => {
          console.log('Create room response:', data);
          toast.success("Success!",{ description: `The ${data.newRoom.roomName} room has been created and is now active.` })
          setRoomName('');
          setRoomDescription('');
          setTimeout(() => {
            navigate(`/room/admin/${data.newRoom.roomCode}`);
          }, 1500);
        },
        onError: () => {
          toast.error('You already have an active room!', { description: "You must end your active room before creating another." });

          // navigate("/dashboard")
        },
      }
    );
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Let's Get This Party Started.
          </CardTitle>
          <CardDescription>
            Give your room a name, description, and we'll handle the rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRoom}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="roomName">Room Name</FieldLabel>
                <Input
                  id="roomName"
                  type="text"
                  placeholder="John's 30th Birthday!"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="roomDescription">
                  Room Description
                </FieldLabel>
                <Textarea
                  id="roomDescription"
                  placeholder="Come join us in celebrating John turning big 30!"
                  required
                  aria-required
                  rows={4}
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={createRoom.isPending}>
                  {createRoom.isPending ? 'Creating...' : 'Create'}
                </Button>
                <FieldDescription className="text-center">
                  The room name and description will be visible to everyone who
                  joins your room.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking create, you agree to our{' '}
        <a href="/terms-and-conditions" target="_blank">
          Terms and Conditions
        </a>{' '}
        and{' '}
        <a href="/privacy-policy" target="_blank">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}