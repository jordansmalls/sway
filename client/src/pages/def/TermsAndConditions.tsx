import React, { useState } from 'react';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export const TermsAndConditions: React.FC = () => {
  const [lastUpdated] = useState<string>('May 26, 2026');

  const sections: Section[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: (
        <p>
          By accessing or using Sway, you agree to be bound by these Terms and
          Conditions and all applicable laws and regulations. If you do not
          agree with any of these terms, you are prohibited from using or
          accessing this site and our services.
        </p>
      ),
    },
    {
      id: 'eligibility',
      title: '2. Eligibility and Account',
      content: (
        <>
          <p>
            You must be at least 13 years old to use Sway. By creating an
            account, you represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              All registration information you submit is truthful and accurate.
            </li>
            <li>You will maintain the accuracy of such information.</li>
            <li>
              Your use of Sway does not violate any applicable law or
              regulation.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'user-conduct',
      title: '3. User Conduct & Acceptable Use',
      content: (
        <p>
          Users are entirely responsible for all content they upload, post, or
          otherwise transmit via Sway. You agree not to use the service to host,
          display, or share any content that is unlawful, harmful, threatening,
          abusive, harassing, defamatory, vulgar, obscene, or invasive of
          another's privacy.
        </p>
      ),
    },
    {
      id: 'intellectual-property',
      title: '4. Intellectual Property Rights',
      content: (
        <p>
          The service and its original content, features, and functionality are
          and will remain the exclusive property of Sway and its licensors. Our
          trademarks and trade dress may not be used in connection with any
          product or service without the prior written consent of Sway.
        </p>
      ),
    },
    {
      id: 'termination',
      title: '5. Termination',
      content: (
        <p>
          We may terminate or suspend your account and bar access to the service
          immediately, without prior notice or liability, under our sole
          discretion, for any reason whatsoever, including without limitation if
          you breach the Terms.
        </p>
      ),
    },
    {
      id: 'limitation-liability',
      title: '6. Limitation of Liability',
      content: (
        <p>
          In no event shall Sway, nor its directors, employees, partners,
          agents, suppliers, or affiliates, be liable for any indirect,
          incidental, special, consequential, or punitive damages, including
          without limitation, loss of profits, data, use, goodwill, or other
          intangible losses, resulting from your access to or use of the
          service.
        </p>
      ),
    },
    {
      id: 'changes',
      title: '7. Changes to Terms',
      content: (
        <p>
          We reserve the right, at our sole discretion, to modify or replace
          these Terms at any time. If a revision is material, we will provide at
          least 30 days' notice prior to any new terms taking effect. What
          constitutes a material change will be determined at our sole
          discretion.
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
    <div className="max-w-6xl mx-auto px-4 py-12 font-sans text-gray-800">
      {/* Header */}
      <div className="text-center border-b border-gray-200 pb-8 mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Terms and Conditions
        </h1>
        <p className="mt-4 text-base text-gray-500">
          Welcome to Sway. Please read these terms carefully before using our
          platform.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Last Updated: {lastUpdated}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Navigation */}
        <aside className="md:w-1/4 sticky top-6 h-fit hidden md:block">
          <nav className="space-y-1 border-l border-gray-200 pl-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="block w-full text-left text-sm text-gray-600 hover:text-indigo-600 hover:font-medium py-1.5 transition-colors duration-150"
              >
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Legal Content */}
        <main className="md:w-3/4 space-y-10">
          <section className="prose max-w-none text-gray-600 leading-relaxed">
            <p className="text-lg font-medium text-gray-900">
              Please read these Terms and Conditions ("Terms", "Terms and
              Conditions") carefully before using the Sway platform (the
              "Service") operated by Sway ("us", "we", or "our").
            </p>
          </section>

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 border-b border-gray-100 pb-8 last:border-0"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {section.title}
              </h2>
              <div className="text-gray-600 leading-relaxed space-y-3">
                {section.content}
              </div>
            </section>
          ))}

          {/* Contact Section */}
          <section className="bg-gray-50 rounded-2xl p-6 mt-12 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Questions or Concerns?
            </h3>
            <p className="text-sm text-gray-600">
              If you have any questions about these Terms, please contact our
              legal team at{' '}
              <a
                href="mailto:legal@sway.com"
                className="text-indigo-600 hover:underline font-medium"
              >
                legal@sway.com
              </a>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};
