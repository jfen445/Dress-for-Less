"use client";

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

const SubSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <h3 className="font-semibold text-base mt-4">{title}</h3>
    <div className="mt-1 space-y-2">{children}</div>
  </div>
);

const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc ml-5 space-y-1">
    {items.map((item, idx) => (
      <li key={idx}>{item}</li>
    ))}
  </ul>
);

const Policies = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">
        Dress for Less Terms & Conditions
      </h1>

      {/* POSTAGE */}
      <Section title="Postage">
        <SubSection title="Postage Costs">
          <List
            items={[
              <>Standard return postage: $15 (includes prepaid return bag).</>,
              <>One-way postage: $7.50.</>,
              <>
                Rural delivery surcharge: $5 - please notify us if you are rural
                before booking.
              </>,
            ]}
          />
        </SubSection>

        <SubSection title="Delivery Timeframes">
          <List
            items={[
              <>
                Friday/Saturday rentals: posted on the Wednesday before your
                event via overnight courier.
              </>,
              <>
                Monday dispatch available for an additional $15 (subject to
                availability).
              </>,
              <>
                Postal rentals for the weekend cut-off on Tuesday evenings. Late
                bookings after this will not receive store credit or refunds if
                not delivered on time (pickup recommended).
              </>,
              <>
                Tracking numbers are sent via email. If not received by
                Wednesday afternoon, contact us ASAP.
              </>,
            ]}
          />
        </SubSection>

        <SubSection title="Returns">
          <List
            items={[
              <>
                Rentals must be dropped at a NZ Post office before 1pm the next
                working day (Mon–Fri).
              </>,
              <>Use the provided return bag.</>,
              <>If the return bag is lost, contact us immediately.</>,
              <>Follow all return instructions to avoid late fees.</>,
            ]}
          />
        </SubSection>

        <SubSection title="Refunds & Issues">
          <List
            items={[
              <>
                If a garment is unavailable due to damage, we will offer a
                refund or exchange.
              </>,
              <>
                Courier delays outside our control: rental fee refunded only
                (shipping non-refundable).
              </>,
            ]}
          />
        </SubSection>
      </Section>

      {/* PICKUP */}
      <Section title="Pickup">
        <SubSection title="Pickup Times">
          <List
            items={[
              <>
                Standard pickup: day before your event unless arranged
                otherwise.
              </>,
              <>Early pickup: $7.50 per day (must be confirmed in advance).</>,
            ]}
          />
        </SubSection>

        <SubSection title="Return Deadlines">
          <List
            items={[
              <>Weekend rentals: return by Monday 8pm.</>,
              <>Weekday rentals: return by 12pm next day.</>,
              <>
                Late returns disrupt scheduling and may affect other customers.
              </>,
            ]}
          />
        </SubSection>

        <SubSection title="Alternative Returns">
          <List
            items={[
              <>Contact us before shipping your rental back.</>,
              <>Must be overnight shipping with tracking.</>,
              <>Late fees apply if conditions are not met.</>,
            ]}
          />
        </SubSection>

        <SubSection title="Pickup Location">
          <p>Pickup is from Albany, Auckland.</p>
          <p>Exact address provided upon booking confirmation.</p>
        </SubSection>
      </Section>

      {/* GENERAL POLICIES */}
      <Section title="General Rental Policies">
        <SubSection title="Late Fees">
          <p>
            A $15 per day late fee applies. Late returns impact other customers,
            so please return on time.
          </p>
        </SubSection>

        <SubSection title="Booking Confirmation">
          <p>
            Rentals are not confirmed until we receive a screenshot of your
            payment.
          </p>
        </SubSection>

        <SubSection title="Refund Policy">
          <List
            items={[
              <>No refunds for change of mind.</>,
              <>No refunds for fit or sizing issues.</>,
            ]}
          />
          <p className="mt-2">
            We recommend contacting us for sizing advice before booking.
          </p>
        </SubSection>

        <SubSection title="Garment Condition">
          <p>
            As a rental service, normal wear and tear may be present. We aim for
            excellent condition, but minor imperfections may occur.
          </p>
          <p>Any unwearable garments will not be rented out.</p>
        </SubSection>

        <SubSection title="Issues & Returns">
          <List
            items={[
              <>Report issues within 6 hours of receiving the item.</>,
              <>
                For refunds, items must be returned within 24 hours for
                inspection.
              </>,
              <>
                Refunds will be issued if deemed appropriate after inspection.
              </>,
            ]}
          />
        </SubSection>
      </Section>
    </div>
  );
};

export default Policies;
