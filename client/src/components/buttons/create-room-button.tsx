import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useActiveRoomQuery } from "@/api/users";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "../ui/button";
import { SpinnerButton } from "./spinner-button";

const CreateRoomButton = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userId = user?._id ?? "";

  const { data: activeRoomData, isLoading } = useActiveRoomQuery(userId);

  const activeRoom = activeRoomData?.activeRoom ?? null;
  const userHasActiveRoom = Boolean(activeRoom);

  const handleClickJoin = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      e.preventDefault();

      const roomCode = activeRoom?.roomCode;
      if (!roomCode) {
        toast.error("Oops!", {
          description: "We couldn't find your active room. Please try again.",
        });
        return;
      }

      toast.success("Let's Go!", { description: "Joining room now..." });
      navigate(`/room/admin/${roomCode}`);
    } catch (err) {
      console.error(
        "There was an error attempting to join or create a room:",
        err
      );
      toast.error("Oops!", {
        description:
          "We're sorry, something went wrong on our end. Please try again.",
      });
    }
  };

  const handleClickCreate = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      e.preventDefault();
      navigate("/create-room");
    } catch (err) {
      console.error(
        "There was an error sending you to the create room screen:",
        err
      );
      toast.error("Oops!", {
        description:
          "We're sorry, something went wrong on our end. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <SpinnerButton isLoading loadingText="Loading...">
        Create Room
      </SpinnerButton>
    );
  }

  if (userHasActiveRoom) {
    return <Button onClick={handleClickJoin}>Join Room</Button>;
  }

  return <Button onClick={handleClickCreate}>Create Room</Button>;
};

export default CreateRoomButton;
