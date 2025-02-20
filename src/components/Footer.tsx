export default function Footer() {
  return (
    <footer className="bg-white rounded-lg m-4">
      <div className="w-full max-w-screen-xl mx-auto p-4 md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <a href="/" className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse">
            {/* Minimalistic and Modern SVG Logo */}
            <svg className="h-8 w-auto" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="22" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="bold" fill="black">Sway</text>
              <circle cx="80" cy="15" r="4" fill="black" />
            </svg>
          </a>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium transition-colors duration-300 hover:text-[dodgerblue] sm:mb-0">
            <li>
              <a href="#" className="hover:text-[#3FA9FF] me-4 md:me-6">About</a>
            </li>
            <li>
              <a href="#" className="hover:text-[#3FA9FF] me-4 md:me-6">Privacy Policy</a>
            </li>
            <li>
              <a href="#" className="hover:text-[#3FA9FF] me-4 md:me-6">Licensing</a>
            </li>
            <li>
              <a href="#" className="hover:text-[#3FA9FF] me-4 md:me-6">Contact</a>
            </li>
          </ul>
        </div>
        <hr className="my-6 border-gray-200 sm:mx-auto lg:my-8" />
        <span className="block text-sm sm:text-center">
          © {new Date().getFullYear()}{" "}
          <a href="/">
            <span className="transition-colors duration-300 hover:text-[dodgerblue]">Sway</span>
          </a>. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
