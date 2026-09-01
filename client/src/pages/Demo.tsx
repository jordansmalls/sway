import { SwayLogo } from '@/components/sway-logo';
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { TextAnimate } from "@/registry/magicui/text-animate"
import { Highlighter } from "@/registry/magicui/highlighter"

export default function Demo() {
  return (
    <div className="flex min-h-svh flex-col bg-white text-zinc-950 dark:bg-background dark:text-foreground">
      <main className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-2xl text-center">
          <a
            href="https://www.sway.onl"
            className="mx-auto mb-9 flex w-fit items-center gap-2.5 text-xl font-bold tracking-[-0.04em]"
          >
            <SwayLogo className="h-8" />
          </a>

          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            <TextAnimate as="span" animation="scaleUp" by="text" once delay={0.1}>Try it out</TextAnimate>{" "}
            <Highlighter action="underline" color="dodgerblue" strokeWidth={3} delay={1000} isView>
              <TextAnimate as="span" animation="scaleUp" by="text" once delay={0.1}>now!</TextAnimate>
            </Highlighter>
          </h1>
          <TextAnimate animation="scaleUp" by="text" once delay={0.2} segmentClassName="whitespace-normal" className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-500 dark:text-muted-foreground">
            Jump in and try Sway without any friction! Just choose if you want to test the room experience as a DJ or as a Guest, and get started.
          </TextAnimate>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-14 w-full px-10 text-base transition-[color,background-color,border-color,box-shadow,transform,scale,rotate] duration-200 hover:-rotate-2 motion-reduce:hover:rotate-0 sm:w-44">
              <Link to="/demo/dj">As DJ</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 w-full px-10 text-base transition-[color,background-color,border-color,box-shadow,transform,scale,rotate] duration-200 hover:rotate-2 motion-reduce:hover:rotate-0 sm:w-44">
              <Link to="/demo/guest">As Guest</Link>
            </Button>
          </div>
          <TextAnimate animation="scaleUp" by="text" once delay={0.3} segmentClassName="whitespace-normal" className="mt-7 text-xs leading-5 text-zinc-500 dark:text-muted-foreground">
            No signup, no setup, no pressure.
          </TextAnimate>
        </div>
      </main>

      <footer className="px-6 pb-7 text-center text-sm text-zinc-500 dark:text-muted-foreground">
        <TextAnimate as="span" animation="scaleUp" by="text" once delay={0.4}>Ready for the real thing?</TextAnimate>{" "}
        <Link to="/signup" className="inline-block font-medium text-[#1e90ff] transition-[opacity,rotate] duration-200 hover:opacity-85 motion-safe:hover:rotate-2 motion-reduce:transition-none">
          <TextAnimate as="span" animation="scaleUp" by="text" once delay={0.5}>Create an account</TextAnimate>
        </Link>
      </footer>
    </div>
  )
}
