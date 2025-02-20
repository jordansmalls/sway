export default function Header() {
  return (
    <header className="flex justify-between items-center px-6 py-4 lg:mx-[12rem] lg:mt-[3rem]">
      <div>
        <span className="text-2xl font-bold tracking-tighter text-gray-900">sway</span>
      </div>
      <div className="flex gap-8 items-center">
        <a href="/login" className="text-gray-900 font-medium transition-colors duration-300 hover:text-[dodgerblue]">
          Login
        </a>
        <a href="/signup">
          <button className="px-6 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-[dodgerblue] rounded-lg hover:bg-[#3FA9FF] focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80">
            Sign Up
          </button>
        </a>
      </div>
    </header>
  );
}
