import React from "react";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-3 border-b pb-2">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-gray-700">
      {children}
    </div>
  </div>
);

const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc ml-5 space-y-1">
    {items.map((item, idx) => (
      <li key={idx}>{item}</li>
    ))}
  </ul>
);

const PrivacyPolicyContent = () => {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">
        Dress for Less Privacy Policy
      </h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: 06/08/2026</p>

      <Section title="What we collect">
        <p>
          We collect personal information from you, including information
          about your:
        </p>
        <List
          items={[
            <>Name</>,
            <>Contact information</>,
            <>
              Event date, delivery address, and whether your delivery
              address is classified as rural
            </>,
            <>
              Communications and interactions with us, including enquiries,
              emails, social media messages, and customer support requests
            </>,
            <>Order, rental, payment, and billing information</>,
          ]}
        />
      </Section>

      <Section title="Why we collect it">
        <p>We collect your personal information in order to:</p>
        <List
          items={[
            <>Process your rental bookings, orders, and payments</>,
            <>
              Arrange delivery, click-and-collect, or in-store pickup, and
              manage returns of rented items
            </>,
            <>
              Charge, hold, or refund security bonds/deposits for garments,
              and assess any damage, loss, or late-return charges
            </>,
            <>
              Communicate with you about your booking (confirmations, fitting
              appointments, delivery updates, return reminders)
            </>,
            <>Maintain your account and rental history</>,
            <>
              Prevent and investigate fraud, theft, or misuse of rented
              garments
            </>,
            <>
              Comply with our legal and regulatory obligations, including tax
              and accounting record-keeping requirements
            </>,
            <>
              Improve our services, website, and customer experience,
              including through analytics
            </>,
          ]}
        />
      </Section>

      <Section title="Who we share it with">
        <p>Besides our staff, we share this information with:</p>
        <List
          items={[
            <>
              <strong>Stripe</strong>, to process payments, invoicing, and
              manage security bond charges/refunds
            </>,
            <>
              <strong>Resend</strong>, to send you transactional and
              marketing emails (booking confirmations, delivery/return
              reminders, promotional emails)
            </>,
            <>
              <strong>Google</strong>, to let you sign in to your account
              securely, if you choose to use Google Sign-In (Google may
              receive your name and email address as part of this process)
            </>,
            <>
              <strong>NZ Post</strong>, to deliver rented garments to you and
              arrange collection/return of items
            </>,
            <>
              <strong>Vercel</strong>, to host our website and ensure it runs
              securely and reliably
            </>,
          ]}
        />
      </Section>

      <Section title="Cookies">
        <p>
          We use cookies and similar technologies to operate our website,
          remember your preferences, understand how visitors use our
          website, and improve our services. You can disable cookies in your
          browser settings, although some features of the website may not
          function correctly if you do.
        </p>
      </Section>

      <Section title="Sending information overseas">
        <p>
          Some of the third parties we use, including Stripe, Resend,
          Google, and Vercel, are based overseas and may store or process
          your information outside New Zealand. Where this happens, we take
          reasonable steps to ensure your information is protected to a
          standard comparable to the New Zealand Privacy Act 2020, including
          relying on these providers&rsquo; own privacy, security, and data
          protection commitments.
        </p>
      </Section>

      <Section title="Your choices">
        <p>Providing some information is optional. However:</p>
        <List
          items={[
            <>
              If you choose not to give us your name and contact details,
              we&rsquo;ll be unable to process your booking or confirm your
              rental.
            </>,
            <>
              If you choose not to give us your delivery address, we&rsquo;ll
              be unable to deliver your garment to you (in-store collection
              may still be available, if offered).
            </>,
            <>
              If you choose not to give us your payment details, we&rsquo;ll
              be unable to take payment for your rental or hold the required
              security bond.
            </>,
            <>
              If you choose not to give us your event date, we&rsquo;ll be
              unable to determine the correct dispatch and return timing for
              your rental.
            </>,
          ]}
        />
      </Section>

      <Section title="Accessing and correcting your information">
        <p>
          You have the right to ask for a copy of any personal information we
          hold about you, and to ask for it to be corrected if you think it
          is wrong. To make a request, please contact us at{" "}
          <a
            href="mailto:dressforlessnz@gmail.com"
            className="text-indigo-600 underline"
          >
            dressforlessnz@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="Complaints">
        <p>
          If you have concerns about how we&rsquo;ve handled your personal
          information, please contact us first at{" "}
          <a
            href="mailto:dressforlessnz@gmail.com"
            className="text-indigo-600 underline"
          >
            dressforlessnz@gmail.com
          </a>{" "}
          so we can try to resolve it. If you&rsquo;re not satisfied with our
          response, you can make a complaint to the Office of the Privacy
          Commissioner at{" "}
          <a
            href="https://www.privacy.org.nz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline"
          >
            privacy.org.nz
          </a>{" "}
          or by calling 0800 803 909.
        </p>
      </Section>
    </>
  );
};

export default PrivacyPolicyContent;
