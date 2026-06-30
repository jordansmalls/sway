import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';



export default function NotFound() {

  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/dashboard")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="https://www.sway.onl"
          className="flex items-center gap-2 self-center font-black tracking-tighter"
          target="_blank"
        >
          Sway
        </a>

        <div className="text-center">
          <h1 className="font-bold text-[10rem] tracking-tighter leading-40">
            404
          </h1>
          <p>Seems like you got lost. This page does not exist.</p>

          <Button onClick={handleClick} className="mt-[1rem]">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
