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

const PoliciesContent = () => {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">
        Dress for Less Terms & Conditions
      </h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: 22/07/2026</p>

      <div className="space-y-3 text-sm leading-relaxed text-gray-700 mb-8">
        <p>
          By placing an order, making payment, collecting a garment, or
          accepting delivery of a garment, you confirm that you have read,
          understood, and agreed to these Terms & Conditions.
        </p>
        <p>Please read these terms carefully before completing your booking.</p>
        <p>
          Nothing in these Terms & Conditions limits any rights or remedies
          you may have under the Consumer Guarantees Act 1993, the Fair
          Trading Act 1986 or any other applicable New Zealand law.
        </p>
      </div>

      {/* 1. DEFINITIONS */}
      <Section title="1. Definitions">
        <p>In these Terms & Conditions:</p>
        <List
          items={[
            <>
              <strong>&ldquo;Dress for Less&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo; or &ldquo;our&rdquo;</strong> means Dress for
              Less NZ.
            </>,
            <>
              <strong>
                &ldquo;Customer&rdquo;, &ldquo;renter&rdquo;, &ldquo;you&rdquo;
                or &ldquo;your&rdquo;
              </strong>{" "}
              means the person who places the booking and accepts
              responsibility for the rented garment.
            </>,
            <>
              <strong>&ldquo;Garment&rdquo; or &ldquo;rental&rdquo;</strong>{" "}
              includes any dress, outfit, set, accessory or other item
              supplied as part of your booking.
            </>,
            <>
              <strong>&ldquo;Event date&rdquo;</strong> means the date
              selected by you when placing your booking. This is the date you
              intend to wear the garment. It is not necessarily the date the
              garment will be dispatched, delivered, collected or returned.
            </>,
            <>
              <strong>&ldquo;Rental period&rdquo;</strong> means the period
              beginning when the garment is collected by or delivered to you
              and ending when it is returned to Dress for Less in accordance
              with the applicable return instructions.
            </>,
            <>
              <strong>&ldquo;Working day&rdquo;</strong> means Monday to
              Friday, excluding New Zealand public holidays.
            </>,
          ]}
        />
      </Section>

      {/* 2. GENERAL RENTAL TERMS */}
      <Section title="2. General Rental Terms">
        <p>
          All garments remain the legal property of Dress for Less at all
          times. Renting a garment gives you the temporary right to use it
          during the agreed rental period. It does not transfer ownership of
          the garment to you.
        </p>
        <p>
          The garment is your responsibility while it is in your possession
          or control. This responsibility begins when:
        </p>
        <List
          items={[
            <>you or another person collects the garment on your behalf;</>,
            <>
              the garment is delivered to the address supplied with your
              order; or
            </>,
            <>the garment is otherwise provided to you.</>,
          ]}
        />
        <p>Your responsibility ends once:</p>
        <List
          items={[
            <>
              a pickup rental has been returned to the specified Dress for
              Less return location in accordance with the return
              instructions; or
            </>,
            <>
              a postal rental has been handed over the counter at an approved
              NZ Post location and tracking confirms that NZ Post has
              accepted the parcel.
            </>,
          ]}
        />
        <p>
          You must not sell, lend, sub-hire, give away or transfer the
          garment to another person without prior approval from Dress for
          Less.
        </p>
        <p>
          The garment is supplied for personal use and should ordinarily be
          worn only by the person for whom the booking was made.
        </p>
        <p>
          We may refuse or cancel a booking where reasonably necessary,
          including where:
        </p>
        <List
          items={[
            <>payment has not been received;</>,
            <>
              information supplied with the booking appears to be incorrect
              or fraudulent;
            </>,
            <>the customer has previously failed to return a garment;</>,
            <>
              the customer has unpaid fees or an unresolved dispute with
              Dress for Less;
            </>,
            <>the garment has become unavailable;</>,
            <>
              fulfilling the booking would create an unreasonable risk to the
              garment or another customer&rsquo;s booking; or
            </>,
            <>
              the customer has seriously or repeatedly breached these Terms &
              Conditions.
            </>,
          ]}
        />
        <p>
          Any decision to refuse service will be made in accordance with
          applicable New Zealand law.
        </p>
      </Section>

      {/* 3. CHANGES TO THESE TERMS */}
      <Section title="3. Changes to These Terms">
        <p>
          We may update these Terms & Conditions from time to time to reflect
          changes to our services, pricing, booking system or business
          operations.
        </p>
        <p>
          The Terms & Conditions that apply to your booking will generally be
          the version displayed on our website when your booking is placed.
        </p>
        <p>
          We will not apply a materially less favourable change retrospectively
          to an existing booking unless:
        </p>
        <List
          items={[
            <>the change is required by law;</>,
            <>
              the change is necessary for safety or to prevent fraud; or
            </>,
            <>you agree to the change.</>,
          ]}
        />
      </Section>

      {/* 4. BOOKINGS AND PAYMENT */}
      <Section title="4. Bookings and Payment">
        <SubSection title="4.1 Booking confirmation">
          <p>
            A garment is not reserved or confirmed until full payment has
            been received and you have received confirmation from Dress for
            Less.
          </p>
          <p>
            Where payment is made by bank transfer (through Instagram etc),
            you may be asked to send proof or a screenshot of payment.
            Sending proof of payment does not guarantee the booking if the
            payment has not been received or another customer has already
            secured the garment.
          </p>
          <p>
            Garments are booked on a first-paid, first-confirmed basis. We do
            not guarantee availability and are not required to hold a garment
            while waiting for payment.
          </p>
        </SubSection>

        <SubSection title="4.2 Customer information">
          <p>
            You are responsible for ensuring that all information supplied
            with your booking is complete and correct, including:
          </p>
          <List
            items={[
              <>your full name;</>,
              <>email address;</>,
              <>event date;</>,
              <>selected garment and size;</>,
              <>pickup or postage selection;</>,
              <>delivery address;</>,
              <>whether the delivery address is rural; and</>,
              <>any date by which you will be leaving the delivery address.</>,
            ]}
          />
          <p>
            Please check your booking confirmation as soon as it is received.
            Contact us promptly if any information is incorrect.
          </p>
        </SubSection>

        <SubSection title="4.3 Incorrect booking information">
          <p>
            Dress for Less is not responsible for delays, missed deliveries
            or other issues caused by incorrect or incomplete information
            supplied by the customer.
          </p>
          <p>This includes selecting:</p>
          <List
            items={[
              <>the wrong garment;</>,
              <>the wrong size;</>,
              <>the wrong event date;</>,
              <>the wrong delivery method;</>,
              <>an incomplete or incorrect address; or</>,
              <>standard delivery for a rural address.</>,
            ]}
          />
          <p>
            We will try to correct genuine booking mistakes when contacted
            promptly, but changes are subject to availability and may incur
            additional costs.
          </p>
        </SubSection>

        <SubSection title="4.4 Prices and additional charges">
          <p>All prices are displayed in New Zealand dollars.</p>
          <p>
            The rental price covers use of the garment for the agreed rental
            period and standard cleaning following ordinary wear.
          </p>
          <p>Additional charges may apply for matters including:</p>
          <List
            items={[
              <>postage;</>,
              <>rural delivery;</>,
              <>early pickup;</>,
              <>extended rentals;</>,
              <>late returns;</>,
              <>replacement return packaging;</>,
              <>additional cleaning;</>,
              <>repairs;</>,
              <>missing accessories;</>,
              <>loss, theft or non-return; and</>,
              <>damage beyond normal rental wear.</>,
            ]}
          />
          <p>
            Any applicable additional charges are explained in these Terms &
            Conditions or will be agreed with you before the relevant
            additional service is provided, where reasonably possible.
          </p>
        </SubSection>

        <SubSection title="4.5 Coupon codes">
          <p>
            Coupon codes must be entered and successfully applied when
            placing the booking.
          </p>
          <p>
            Unless required by law or caused by an error in our booking
            system, discounts cannot be applied retrospectively after an
            order has been completed.
          </p>
          <p>Coupon codes:</p>
          <List
            items={[
              <>may have specific expiry dates or eligibility requirements;</>,
              <>may only be used by the intended recipient;</>,
              <>cannot ordinarily be exchanged for cash;</>,
              <>cannot ordinarily be combined with another discount; and</>,
              <>
                may be cancelled where they have been obtained or used
                fraudulently.
              </>,
            ]}
          />
        </SubSection>
      </Section>

      {/* 5. EVENT DATES AND RENTAL PERIODS */}
      <Section title="5. Event Dates and Rental Periods">
        <p>
          When booking a garment, you must select the date of your event. The
          event date is not the pickup date or dispatch date.
        </p>

        <SubSection title="5.1 Pickup bookings">
          <p>
            For a standard pickup booking, the garment will generally be
            available to collect on the day before your event.
          </p>
          <p>
            For example, if your event is on Saturday, you should select
            Saturday as your event date. Your standard pickup will generally
            be available on Friday.
          </p>
          <p>
            The exact collection instructions and availability time will be
            provided by email.
          </p>
        </SubSection>

        <SubSection title="5.2 Postal bookings">
          <p>
            For a postal booking, the garment will be dispatched before your
            event date in accordance with the postal dispatch policy below.
          </p>
          <p>The dispatch date is selected by Dress for Less based on:</p>
          <List
            items={[
              <>your event date;</>,
              <>the delivery address;</>,
              <>courier operating days;</>,
              <>garment availability;</>,
              <>the garment&rsquo;s previous booking and return date; and</>,
              <>
                whether an extended or early-dispatch service has been
                purchased.
              </>,
            ]}
          />
        </SubSection>

        <SubSection title="5.3 Extended rental periods">
          <p>
            A garment must not be collected earlier, retained longer or taken
            overseas unless this has been approved by Dress for Less in
            advance.
          </p>
          <p>Additional rental or early-pickup charges may apply.</p>
          <p>
            Approval is not confirmed until Dress for Less has agreed to the
            arrangement in writing and any additional amount has been paid.
          </p>
        </SubSection>
      </Section>

      {/* 6. GARMENT INFORMATION, CONDITION AND APPEARANCE */}
      <Section title="6. Garment Information, Condition and Appearance">
        <SubSection title="6.1 Rental condition">
          <p>
            Dress for Less is a garment rental service. Garments have
            generally been worn by previous customers and should not be
            expected to be in brand-new or pristine retail condition.
          </p>
          <p>Reasonable signs of rental wear may include:</p>
          <List
            items={[
              <>minor fabric pilling;</>,
              <>small loose threads;</>,
              <>minor pulls;</>,
              <>light fading;</>,
              <>small or faint marks that are not obvious when worn;</>,
              <>previous professional repairs;</>,
              <>minor wear around zips, clasps, hems or straps; and</>,
              <>
                other minor imperfections consistent with the age and rental
                history of the garment.
              </>,
            ]}
          />
          <p>
            We inspect garments and do not knowingly rent garments that we
            consider unwearable.
          </p>
          <p>
            A minor imperfection that does not materially affect the
            appearance, function or wearability of a garment will not
            automatically make it faulty or entitle the customer to a refund.
          </p>
          <p>
            Any significant imperfection known to us that may reasonably
            affect a customer&rsquo;s decision to book will be disclosed on
            the product listing or communicated before the garment is
            supplied.
          </p>
        </SubSection>

        <SubSection title="6.2 Condition ratings">
          <p>Where a condition rating is displayed, it should be interpreted as follows:</p>
          <List
            items={[
              <>
                <strong>Excellent:</strong> The garment is in near-new rental
                condition with minimal or no noticeable signs of wear. Minor
                rental wear may still be present upon close inspection.
              </>,
              <>
                <strong>Great:</strong> The garment has light signs of
                previous wear but remains in very good, presentable
                condition. Any wear should generally be minor or not
                noticeable when the garment is worn.
              </>,
              <>
                <strong>Good:</strong> The garment has some visible signs of
                rental wear, minor imperfections or previous repairs. It
                remains wearable and presentable, but it should not be
                expected to appear new.
              </>,
              <>
                <strong>Okay:</strong> The garment has more noticeable signs
                of rental wear or disclosed imperfections. It remains
                wearable, and any relevant known flaws will be described or
                shown on the listing.
              </>,
            ]}
          />
          <p>
            Condition ratings are intended as a general guide. Garment
            condition may change over time as a result of ordinary rental
            use, cleaning and repairs.
          </p>
        </SubSection>

        <SubSection title="6.3 Product photographs and colours">
          <p>
            Product photographs may include images supplied by the original
            brand, previous owners, customers or Dress for Less.
          </p>
          <p>Colours may appear slightly different depending on:</p>
          <List
            items={[
              <>lighting;</>,
              <>photography;</>,
              <>editing;</>,
              <>screen settings;</>,
              <>the age of the garment; and</>,
              <>normal colour fading through wear and cleaning.</>,
            ]}
          />
          <p>
            A minor variation in colour between the garment and an online
            photograph does not automatically entitle the customer to a
            refund.
          </p>
        </SubSection>

        <SubSection title="6.4 Creasing">
          <p>
            Garments are cleaned and prepared before each booking. However,
            garments sent by post must be folded to fit safely inside their
            packaging and may crease during transit.
          </p>
          <p>
            Some garments may require light steaming after delivery. You must
            contact Dress for Less before ironing or steaming a garment if
            you are unsure whether heat can safely be used on the fabric.
          </p>
          <p>
            Dress for Less is not responsible for damage caused by ironing,
            steaming or applying heat without following our instructions.
          </p>
        </SubSection>
      </Section>

      {/* 7. SIZING, MEASUREMENTS AND FIT */}
      <Section title="7. Sizing, Measurements and Fit">
        <SubSection title="7.1 Label size">
          <p>
            The label size shown on a product listing is the size stated on
            the garment&rsquo;s original brand label.
          </p>
          <p>
            Sizing can differ between brands, styles, fabrics and garment
            designs.
          </p>
        </SubSection>

        <SubSection title="7.2 Recommended size">
          <p>
            Where a recommended size or fit recommendation is provided, it
            represents our general assessment of how the garment may fit
            based on matters such as:
          </p>
          <List
            items={[
              <>the garment&rsquo;s measurements;</>,
              <>fabric stretch;</>,
              <>design and construction;</>,
              <>previous customer feedback; and</>,
              <>our experience with the garment.</>,
            ]}
          />
          <p>
            A recommended size is a guide only. It does not guarantee that
            the garment will fit every person who ordinarily wears that size.
          </p>
          <p>
            Different body shapes and proportions can affect how the same
            garment fits. Two people with similar measurements may experience
            a different fit depending on factors such as height, torso
            length, cup size, shoulder width and body proportions.
          </p>
        </SubSection>

        <SubSection title="7.3 Stretch guide">
          <p>Where a stretch rating is displayed, it should be interpreted as follows:</p>
          <List
            items={[
              <>
                <strong>Stretch 1 – Minimal Stretch:</strong> The fabric has
                little or no stretch. We generally recommend selecting your
                usual size and checking the available garment measurements
                carefully.
              </>,
              <>
                <strong>Stretch 2 – Moderate Stretch:</strong> The fabric has
                some stretch and may accommodate approximately half a size
                above or below the labelled or recommended size, depending on
                the design and the customer&rsquo;s body shape.
              </>,
              <>
                <strong>Stretch 3 – High Stretch:</strong> The fabric is
                highly stretchy and may accommodate approximately one full
                size above or below the labelled or recommended size,
                depending on the design, construction and customer&rsquo;s
                body shape.
              </>,
            ]}
          />
          <p>
            The stretch guide is an estimate only. Stretch does not guarantee
            that every part of the garment will fit outside its labelled
            size. Features such as zips, corsetry, lining, waist seams, cups
            and structured panels may have less stretch than the
            garment&rsquo;s outer fabric.
          </p>
          <p>
            Any garment-specific sizing information will be included under
            the product notes where available.
          </p>
        </SubSection>

        <SubSection title="7.4 Measurements">
          <p>Garment and body measurements are approximate.</p>
          <p>Garment measurements may vary slightly depending on:</p>
          <List
            items={[
              <>where and how the garment is measured;</>,
              <>whether the garment is measured flat or stretched;</>,
              <>fabric movement;</>,
              <>construction;</>,
              <>previous alterations or repairs; and</>,
              <>natural changes caused by wear and cleaning.</>,
            ]}
          />
          <p>
            Measurements are provided to assist with selecting a size and are
            not a guarantee of fit.
          </p>
          <p>
            Please contact us before booking if you require a particular
            measurement or further sizing advice.
          </p>
        </SubSection>

        <SubSection title="7.5 Fit-related refunds">
          <p>
            Customers are responsible for reviewing the product description,
            size, recommended fit, stretch rating, notes and available
            measurements before booking.
          </p>
          <p>
            Unless the product information was materially incorrect or your
            rights under New Zealand consumer law apply, refunds or store
            credit will not be provided because:
          </p>
          <List
            items={[
              <>the garment does not fit;</>,
              <>the garment is too tight or too loose;</>,
              <>the garment does not suit your body shape;</>,
              <>the garment is longer or shorter than expected;</>,
              <>the style does not look as expected;</>,
              <>the customer selected the wrong size; or</>,
              <>
                the customer changes their mind after trying the garment on.
              </>,
            ]}
          />
          <p>
            We recommend booking a try-on appointment or contacting us for
            advice when you are uncertain about sizing.
          </p>
        </SubSection>
      </Section>

      {/* 8. PICKUP BOOKINGS */}
      <Section title="8. Pickup Bookings">
        <SubSection title="8.1 Pickup location">
          <p>
            Pickup is available from Albany, Auckland. The exact address and
            collection instructions will be sent to the email address used
            for your booking. For customer privacy, business security and
            garment security, the full pickup address may not be publicly
            displayed.
          </p>
        </SubSection>

        <SubSection title="8.2 Standard pickup">
          <p>
            Standard pickup is generally available on the day before your
            event unless your booking confirmation states otherwise.
          </p>
          <p>
            You will receive an email when your garment is ready. Please do
            not arrive before receiving your pickup instructions unless a
            specific arrangement has been confirmed.
          </p>
          <p>
            The garment must be collected within the timeframe stated in your
            confirmation email.
          </p>
        </SubSection>

        <SubSection title="8.3 Uncollected bookings">
          <p>
            It is the customer&rsquo;s responsibility to collect the garment
            during the confirmed pickup period.
          </p>
          <p>A refund or store credit will not ordinarily be provided where:</p>
          <List
            items={[
              <>the garment was ready and available as agreed;</>,
              <>correct pickup instructions were supplied; and</>,
              <>
                the customer did not collect the garment in time for their
                event.
              </>,
            ]}
          />
          <p>
            Contact us as soon as possible if you are having difficulty
            collecting your order. We will try to assist, but we cannot
            guarantee an alternative collection time.
          </p>
        </SubSection>

        <SubSection title="8.4 Pickup return deadlines">
          <p>
            Unless your booking confirmation provides a different return
            time:
          </p>
          <List
            items={[
              <>Weekend rentals must be returned by Monday by 8:00pm.</>,
              <>
                Weekday rentals must be returned by 12:00pm on the day after
                the event.
              </>,
            ]}
          />
          <p>
            A &ldquo;weekend rental&rdquo; generally means a rental for an
            event held on Friday, Saturday or Sunday.
          </p>
          <p>
            Public holidays or special rental periods may have different
            return instructions. Any different deadline will be stated in
            your booking confirmation or return instructions.
          </p>
        </SubSection>

        <SubSection title="8.5 Returning a pickup order by post">
          <p>
            You must contact Dress for Less before returning a pickup order
            by post.
          </p>
          <p>Where postal return is approved:</p>
          <List
            items={[
              <>you must place the garment securely in appropriate packaging;</>,
              <>you must use an overnight tracked courier service;</>,
              <>
                you must hand the parcel over the counter at an approved
                postal or courier location;
              </>,
              <>you must send us the tracking number and proof of postage; and</>,
              <>
                you are responsible for the additional postage cost unless
                otherwise agreed.
              </>,
            ]}
          />
          <p>
            The garment must be posted by the return deadline confirmed by
            Dress for Less. Late fees may apply if these instructions are not
            followed.
          </p>
        </SubSection>
      </Section>

      {/* 9. POSTAL BOOKINGS */}
      <Section title="9. Postal Bookings">
        <SubSection title="9.1 Postage charges">
          <p>Unless otherwise stated:</p>
          <List
            items={[
              <>
                Standard return postage is $15 and includes delivery to the
                customer and a prepaid return bag.
              </>,
              <>Rural delivery has an additional $5 surcharge.</>,
            ]}
          />
          <p>
            You must notify us or select the rural delivery option before
            completing your booking if the delivery address is classified as
            rural. If the rural surcharge was not paid, we may request
            payment before dispatching the order.
          </p>
        </SubSection>

        <SubSection title="9.2 Standard dispatch">
          <p>
            Standard postal rentals for Friday, Saturday or Sunday events
            will generally be dispatched on the Wednesday before the event
            using an overnight courier service. Weekday rentals will be
            posted on different days. We always aim for rentals to arrive at
            least 1 day before your event.
          </p>
          <p>Dispatch dates may differ where:</p>
          <List
            items={[
              <>the weekend includes a public holiday;</>,
              <>the garment is returning from an earlier booking;</>,
              <>the customer purchased early dispatch;</>,
              <>the customer placed a late booking;</>,
              <>the delivery address is rural;</>,
              <>courier services are interrupted; or</>,
              <>another arrangement has been confirmed.</>,
            ]}
          />
          <p>
            An overnight courier target does not mean that delivery on the
            following day is guaranteed.
          </p>
        </SubSection>

        <SubSection title="9.3 Tracking information">
          <p>
            Tracking information will be sent to the email address used for
            your booking once the parcel has been prepared or scanned by the
            courier.
          </p>
          <p>
            For a standard weekend booking, contact us as soon as possible if
            you have not received tracking information by 5:00pm on
            Wednesday.
          </p>
          <p>
            Customers are responsible for monitoring the tracking information
            and promptly responding to:
          </p>
          <List
            items={[
              <>attempted delivery notifications;</>,
              <>address issues;</>,
              <>parcels awaiting collection;</>,
              <>delivery instructions;</>,
              <>unexpected tracking updates; and</>,
              <>courier enquiries.</>,
            ]}
          />
        </SubSection>

        <SubSection title="9.4 Delivery addresses">
          <p>You must provide a complete and accurate delivery address.</p>
          <p>Dress for Less is not responsible for a delivery issue caused by:</p>
          <List
            items={[
              <>an incorrect or incomplete address;</>,
              <>the wrong postcode;</>,
              <>failure to include a unit or apartment number;</>,
              <>failure to identify a rural address;</>,
              <>an inaccessible property;</>,
              <>refusal of delivery;</>,
              <>failure to collect a parcel awaiting collection; or</>,
              <>a parcel redirection requested by the customer.</>,
            ]}
          />
          <p>
            Parcel redirections can cause significant delays. A customer who
            redirects a parcel accepts the increased delivery risk and will
            not ordinarily qualify for compensation for a delay caused by the
            redirection.
          </p>
        </SubSection>

        <SubSection title="9.5 Leaving the delivery address">
          <p>
            You must tell us before dispatch if you need the garment by a
            date earlier than your event date, including where you are:
          </p>
          <List
            items={[
              <>travelling to another city;</>,
              <>leaving home for the event;</>,
              <>staying at accommodation;</>,
              <>attending a destination wedding; or</>,
              <>otherwise leaving the delivery address before the event.</>,
            ]}
          />
          <p>
            The event date alone does not tell us when you will leave the
            address. If you are travelling, we would suggest posting it to
            where you are travelling to, where possible.
          </p>
          <p>
            Where the garment arrives at the supplied address before the
            event date but after you have left, no refund or store credit
            will ordinarily be provided if you did not tell us that an
            earlier arrival date was required.
          </p>
        </SubSection>

        <SubSection title="9.7 Safe delivery">
          <p>
            You are responsible for supplying a delivery address where the
            parcel can be safely received.
          </p>
          <p>
            Where tracking records the parcel as delivered but you cannot
            locate it, you must:
          </p>
          <List
            items={[
              <>check the property, mailbox and any safe-drop locations;</>,
              <>
                check with other residents, neighbours, reception or building
                management where applicable;
              </>,
              <>contact NZ Post promptly; and</>,
              <>contact Dress for Less on the day you become aware of the issue.</>,
            ]}
          />
          <p>
            We will assist with any reasonable courier investigation.
            Responsibility for a missing parcel will be assessed based on the
            delivery information, courier investigation, customer
            instructions and applicable law.
          </p>
        </SubSection>
      </Section>

      {/* 10. POSTAL DELAYS AND NON-DELIVERY */}
      <Section title="10. Postal Delays and Non-Delivery">
        <p>
          Courier networks can experience delays due to circumstances
          including weather, network congestion, depot processing, public
          holidays, transport interruptions and incorrect delivery
          information.
        </p>
        <p>
          Dress for Less will take reasonable care when preparing and
          dispatching postal orders, but cannot control the parcel after it
          has been accepted into the courier network.
        </p>

        <SubSection title="10.1 Orders placed before the cut-off">
          <p>Where:</p>
          <List
            items={[
              <>the booking was placed before the recommended cut-off;</>,
              <>the correct postage option was selected;</>,
              <>the customer supplied a complete and accurate address;</>,
              <>the customer did not redirect the parcel;</>,
              <>
                the customer responded appropriately to any courier
                notification; and
              </>,
              <>
                the garment does not arrive before the event due to a
                courier delay,
              </>,
            ]}
          />
          <p>
            Dress for Less will ordinarily refund the garment rental fee. The
            postage charge is non-refundable where the postage service has
            already been purchased and used.
          </p>
          <p>To receive the rental-fee refund:</p>
          <List
            items={[
              <>the garment must remain unworn;</>,
              <>
                the garment must be returned in the same condition in which
                it was sent;
              </>,
              <>the customer must notify Dress for Less promptly; and</>,
              <>
                the parcel must be returned on the day it arrives or handed
                over the counter at NZ Post before 1:00pm on the following
                working day.
              </>,
            ]}
          />
          <p>
            The refund will be considered once the garment has been returned
            and inspected.
          </p>
        </SubSection>

        <SubSection title="10.2 Courier investigation">
          <p>
            Where a parcel appears lost or significantly delayed, Dress for
            Less may open an investigation with the courier.
          </p>
          <p>The customer agrees to provide reasonable assistance, including confirming:</p>
          <List
            items={[
              <>the delivery address;</>,
              <>whether a delivery attempt occurred;</>,
              <>whether the property was checked;</>,
              <>whether other occupants received the parcel; and</>,
              <>any information requested by the courier.</>,
            ]}
          />
          <p>
            Any refund, replacement charge or other outcome may be delayed
            until sufficient information is available to reasonably assess
            what occurred.
          </p>
        </SubSection>
      </Section>

      {/* 11. RETURNING POSTAL RENTALS */}
      <Section title="11. Returning Postal Rentals">
        <SubSection title="11.1 Standard return deadline">
          <p>
            Unless otherwise stated in your booking confirmation, a postal
            rental must be handed over the counter at an approved NZ Post
            location before 1:00pm on the next working day after your event.
          </p>
          <p>For example:</p>
          <List
            items={[
              <>a Saturday event rental must ordinarily be returned before 1:00pm on Monday;</>,
              <>a Sunday event rental must ordinarily be returned before 1:00pm on Monday; and</>,
              <>
                where Monday is a public holiday, the return will ordinarily
                be due before 1:00pm on Tuesday.
              </>,
            ]}
          />
          <p>A Tuesday event must ordinarily be returned before 1:00pm on Wednesday etc.</p>
          <p>
            Follow the specific return date written in your booking
            confirmation or return instructions where it differs from these
            examples.
          </p>
        </SubSection>

        <SubSection title="11.2 Over-the-counter return">
          <p>
            Postal returns must be handed directly over the counter at an
            official NZ Post store or approved service location.
          </p>
          <p>Do not place the parcel in:</p>
          <List
            items={[
              <>a street posting box;</>,
              <>an unattended courier drop box;</>,
              <>a workplace mailroom;</>,
              <>an after-hours chute; or</>,
              <>any location where the parcel may not be scanned promptly.</>,
            ]}
          />
          <p>
            A parcel is not considered returned merely because it has been
            placed in a drop box. It must be accepted and scanned by the
            postal provider.
          </p>
          <p>
            We recommend obtaining a receipt and keeping it until tracking
            confirms delivery to Dress for Less.
          </p>
        </SubSection>

        <SubSection title="11.3 Prepaid return bag">
          <p>
            You must use the prepaid return bag provided with your order
            unless Dress for Less has approved another return method.
          </p>
          <p>Before returning the garment:</p>
          <List
            items={[
              <>place the garment carefully inside its protective packaging;</>,
              <>include all accessories and items supplied with it; and</>,
              <>seal the parcel securely.</>,
            ]}
          />
        </SubSection>

        <SubSection title="11.4 Lost or damaged return bag">
          <p>
            If the prepaid return bag is lost or damaged, contact Dress for
            Less immediately.
          </p>
          <p>You will be required to:</p>
          <List
            items={[
              <>obtain suitable replacement packaging;</>,
              <>use an overnight tracked courier service;</>,
              <>pay the replacement postage cost;</>,
              <>hand the parcel over the counter;</>,
              <>obtain proof of postage; and</>,
              <>send the tracking number to Dress for Less.</>,
            ]}
          />
          <p>
            Loss of the return bag does not extend the rental period or
            return deadline.
          </p>
        </SubSection>

        <SubSection title="11.5 Proof of return">
          <p>Customers should retain proof showing:</p>
          <List
            items={[
              <>the date;</>,
              <>the time;</>,
              <>the postal location; and</>,
              <>the tracking number.</>,
            ]}
          />
          <p>
            Where tracking does not update and the customer cannot provide
            evidence that the parcel was handed over correctly and on time,
            the parcel may be treated as a late return until the return date
            can be verified.
          </p>
        </SubSection>
      </Section>

      {/* 12. LATE RETURNS */}
      <Section title="12. Late Returns">
        <p>
          Returning garments on time is essential because they may be booked
          by another customer shortly afterwards.
        </p>

        <SubSection title="12.1 Late fee">
          <p>
            A late fee of $15 per day may apply where the garment is not
            returned by the stated deadline.
          </p>
          <p>For postal returns, the return may be considered late where:</p>
          <List
            items={[
              <>the parcel was not handed over the counter before the deadline;</>,
              <>the parcel was placed in a drop box;</>,
              <>the wrong or a slower postage service was used;</>,
              <>
                tracking was not provided when alternative postage was
                required; or
              </>,
              <>the garment was retained beyond the agreed rental period.</>,
            ]}
          />
          <p>
            For pickup returns, the return may be considered late once the
            confirmed return time has passed.
          </p>
        </SubSection>

        <SubSection title="12.2 Customer responsibility">
          <p>
            Illness, travel disruption, work commitments, transport
            difficulties or changes in personal circumstances do not
            automatically extend the return deadline.
          </p>
          <p>
            If you cannot return the garment yourself, you are responsible
            for arranging for another trusted person to return it on time.
          </p>
          <p>Contact us before the deadline if an unexpected issue arises.</p>
        </SubSection>

        <SubSection title="12.3 Impact on another booking">
          <p>
            Where a late return directly causes another confirmed booking to
            be cancelled, refunded or replaced, the customer may also be
            required to pay reasonable and documented losses caused by the
            late return.
          </p>
          <p>
            This may include the rental fee refunded to the affected customer
            or reasonable costs incurred to provide an alternative garment.
          </p>
          <p>
            Any additional amount will be assessed based on the actual
            circumstances and will not be imposed as an arbitrary penalty.
          </p>
        </SubSection>

        <SubSection title="12.4 Continuing late fees and non-return">
          <p>Late fees may continue until:</p>
          <List
            items={[
              <>the garment is physically returned;</>,
              <>
                the postal tracking confirms the garment was correctly handed
                over; or
              </>,
              <>another arrangement has been agreed in writing.</>,
            ]}
          />
          <p>
            A garment that remains unreturned may be treated as lost or
            unlawfully retained.
          </p>
          <p>
            Replacement costs and reasonable recovery action may apply in
            addition to late fees.
          </p>
          <p>
            The garment must still be returned even if late fees or
            replacement costs have been charged.
          </p>
        </SubSection>
      </Section>

      {/* 13. CHECKING YOUR GARMENT AND REPORTING PROBLEMS */}
      <Section title="13. Checking Your Garment and Reporting Problems">
        <p>
          You must inspect and try on the garment as soon as reasonably
          possible after receiving or collecting it.
        </p>
        <p>If the garment has:</p>
        <List
          items={[
            <>significant undisclosed damage;</>,
            <>a significant undisclosed stain;</>,
            <>a missing essential accessory;</>,
            <>an incorrect size or style compared with your booking; or</>,
            <>another issue that may prevent it from being worn,</>,
          ]}
        />
        <p>
          you must contact Dress for Less within six hours of receiving or
          collecting it.
        </p>
        <p>Your message should include:</p>
        <List
          items={[
            <>your name and order number;</>,
            <>a clear description of the issue;</>,
            <>clear photographs or video showing the issue; and</>,
            <>whether you believe the garment is wearable.</>,
          ]}
        />
        <p>
          Do not wear, wash, alter or attempt to repair the garment while a
          refund request is being assessed.
        </p>
        <p>
          Where a full refund is requested because the garment is unwearable,
          it must ordinarily be returned unworn within 24 hours or by the
          next available working-day return deadline, as instructed by Dress
          for Less.
        </p>
        <p>
          Refunds or other remedies will be assessed once the garment has
          been returned and inspected.
        </p>
        <p>
          If you choose to wear the garment after becoming aware of an issue,
          this will generally be treated as acceptance that the garment
          remains wearable. A full refund will not ordinarily be available,
          although a partial remedy may be considered depending on the
          circumstances and your rights under New Zealand law.
        </p>
        <p>
          Minor rental wear consistent with the disclosed condition rating is
          not considered a significant fault.
        </p>
      </Section>

      {/* 14. CARING FOR THE GARMENT */}
      <Section title="14. Caring for the Garment">
        <p>
          Please treat the garment carefully and as you would treat a
          valuable item belonging to someone else.
        </p>
        <p>You must not:</p>
        <List
          items={[
            <>wash the garment;</>,
            <>dry-clean the garment;</>,
            <>place it in a dryer;</>,
            <>bleach, soak or scrub it;</>,
            <>make permanent or temporary alterations;</>,
            <>cut or remove labels;</>,
            <>attempt repairs; or</>,
            <>iron or steam it without following appropriate instructions.</>,
          ]}
        />
        <p>Please take reasonable care around:</p>
        <List
          items={[
            <>fake tan;</>,
            <>body makeup;</>,
            <>foundation;</>,
            <>lipstick;</>,
            <>perfume;</>,
            <>deodorant;</>,
            <>food and drinks;</>,
            <>mud;</>,
            <>candles;</>,
            <>cigarettes and vapes;</>,
            <>sharp jewellery;</>,
            <>handbags with clasps;</>,
            <>rough seating surfaces; and</>,
            <>anything that may catch, pull, stain or burn the fabric.</>,
          ]}
        />
        <p>Standard cleaning following normal use is included in the rental price.</p>
        <p>
          Additional cleaning, repair or replacement costs may apply where
          the garment is returned with staining, odour, damage or alteration
          beyond normal rental wear.
        </p>
        <p>
          If an accident happens, contact Dress for Less promptly. Do not
          attempt to clean or repair the garment yourself.
        </p>
      </Section>
    </>
  );
};

export default PoliciesContent;
