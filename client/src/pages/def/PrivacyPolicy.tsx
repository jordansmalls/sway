import React, { useState } from 'react';

interface PolicySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export const PrivacyPolicy: React.FC = () => {
  const [lastUpdated] = useState<string>('May 26, 2026');

  const sections: PolicySection[] = [
    {
      id: 'information-collection',
      title: '1. Information We Collect',
      content: (
        <>
          <p>
            We collect information to provide better services to all our users.
            This includes:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Account Information:</strong> Your username, email address,
              and login credentials when you sign up.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact
              with Sway, including access times, pages viewed, and your IP
              address.
            </li>
            <li>
              <strong>Device Information:</strong> Hardware model, operating
              system version, and unique device identifiers.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'information-use',
      title: '2. How We Use Your Information',
      content: (
        <>
          <p>
            Sway uses the collected data for various purposes, including to:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Provide, operate, and maintain our platform.</li>
            <li>Improve, personalize, and expand our services.</li>
            <li>Understand and analyze how you use our platform.</li>
            <li>
              Communicate with you, either directly or through one of our
              partners, for customer service or updates.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'data-sharing',
      title: '3. Data Sharing and Disclosure',
      content: (
        <p>
          We do not sell your personal data to third parties. We may share
          information with trusted third-party service providers who assist us
          in operating our platform, conducting our business, or serving our
          users, so long as those parties agree to keep this information
          confidential.
        </p>
      ),
    },
    {
      id: 'data-security',
      title: '4. Security of Your Data',
      content: (
        <p>
          The security of your data is important to us, but remember that no
          method of transmission over the Internet, or method of electronic
          storage is 100% secure. While we strive to use commercially acceptable
          means to protect your personal information, we cannot guarantee its
          absolute security.
        </p>
      ),
    },
    {
      id: 'user-rights',
      title: '5. Your Data Protection Rights',
      content: (
        <p>
          Depending on your location, you may have certain rights regarding your
          personal information, such as the right to access, correct, or delete
          the personal data we hold about you. You can manage most of your
          profile details directly within your account settings.
        </p>
      ),
    },
    {
      id: 'policy-changes',
      title: '6. Changes to This Privacy Policy',
      content: (
        <p>
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the "Last Updated" date at the top of this policy.
        </p>
      ),
    },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 font-sans tracking-tight">
      {/* Header */}
      <div className="text-center border-b border-b-accent pb-8 mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Your privacy matters to us. This policy explains how we collect, use,
          and safeguard your data.
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">
          Last Updated: {lastUpdated}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Navigation */}
        <aside className="md:w-1/4 sticky top-6 h-fit hidden md:block">
          <nav className="space-y-1 border-l border-b-accent pl-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="block w-full text-left text-sm text-muted-foreground hover:text-primary hover:font-medium py-1.5 transition-colors duration-300 hover:cursor-pointer"
              >
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Legal Content */}
        <main className="md:w-3/4 space-y-10 tracking-tight">
          <section className="prose max-w-none leading-relaxed">
            <p className="text-lg font-medium text-foreground">
              Sway ("we", "our", or "us") is committed to protecting your
              privacy. This Privacy Policy outlines our practices regarding the
              collection, use, and disclosure of your information when you use
              our mobile application or website.
            </p>
          </section>

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 border-b border-b-accent pb-8 last:border-0"
            >
              <h2 className="text-xl font-bold text-foreground mb-4">
                {section.title}
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                {section.content}
              </div>
            </section>
          ))}

          {/* Contact Section */}
          <section className="bg-card rounded-2xl p-6 mt-12 border border-b-accent">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Privacy Inquiries
            </h3>
            <p className="text-sm text-muted-foreground">
              If you have any questions about this Privacy Policy or wish to
              exercise your data rights, please contact us at{' '}
              <a
                href="mailto:hi@jsmalls.net"
                className="text-primary hover:underline font-medium transition duration-300"
              >
                hi@jsmalls.net
              </a>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};
