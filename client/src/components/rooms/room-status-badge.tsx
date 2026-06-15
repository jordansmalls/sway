import { Badge } from "../ui/badge";
import { Radio, RadioOff } from "lucide-react";

interface RoomStatusBadgeProps {
  active: boolean;
}

const RoomStatusBadge = ({ active }: RoomStatusBadgeProps) => {
  if (active) {
    return (
      <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
        <Radio />
        Live
      </Badge>
    );
  }

  return <Badge variant="destructive">
    <RadioOff />
    Ended
    </Badge>;
};

export default RoomStatusBadge;
