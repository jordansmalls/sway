export default function Hero() {
  return (
    <main className="relative bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-semibold text-4xl sm:text-5xl tracking-tight lg:text-6xl lg:tracking-tighter text-gray-900">
          The easiest way to manage {''}
          <br className="hidden lg:block" />
          <span className="text-transparent bg-gradient-to-br bg-clip-text from-teal-500 via-indigo-500 to-sky-500 dark:from-teal-200">
            song request<span className="lg:mr-0.5">s</span>
          </span> at events
        </h1>
        <p className="mt-4 text-base text-gray-600 lg:text-2xl">
          Let party-goers request songs effortlessly with a live request system—no more distractions for DJs, just smooth music curation.
        </p>
        <a href="/signup">
          <button className="mt-8 px-6 py-3 font-medium tracking-wide text-white transition-colors duration-300 transform bg-[dodgerblue] rounded-lg hover:bg-[#3FA9FF] focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80">
            Get Started
          </button>
        </a>
      </div>

      {/* Hero Image at the bottom */}
      <div className="mt-16 lg:mt-24 mx-auto max-w-4xl">
        <img
          src="https://placehold.co/900x720"
          alt="Preview of App or DJ at a party"
          className="w-full h-auto rounded-lg shadow-xl"
        />
      </div>
    </main>
  );
}
