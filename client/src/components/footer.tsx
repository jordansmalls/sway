const Footer = () => {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between md:gap-0">
          {/* Copyright Section */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              © 2026{' '}
              <a
                href="https://www.sway.onl"
                className="hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sway
              </a>
              . All Rights Reserved.
            </p>
          </div>

          {/* Links Section */}
          <nav>
            <ul className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:gap-6">
              <li>
                <a
                  href="https://www.sway.onl"
                  className="hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/privacy-policy"
                  className="hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms-and-conditions"
                  className="hover:text-foreground transition-colors"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a
                  href="https://www.jsmalls.net"
                  className="hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
