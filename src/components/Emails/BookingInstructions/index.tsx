import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type * as React from "react";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import DFLLogo from "../../.../../../../public/dfl-logo.png";

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

export interface BookingInstructionsItem {
  dressName: string;
  dressImage: string;
  size: string;
  dateBooked: string;
  // Set only on an extended rental, where the dress is due back later than
  // the day of the event.
  endDate?: string;
  deliveryType: string;
}

export interface BookingInstructionsProps {
  name: string;
  // The whole order, not one line of it: an order with three dresses gets one
  // email listing all three rather than three near-identical emails.
  items: BookingInstructionsItem[];
}

const isPickupLed = (deliveryType: string) =>
  deliveryType === DeliveryType.Pickup ||
  deliveryType === DeliveryType.PickupDelivery;

// Takes the order's delivery types, because one order can mix them — a mixed
// order gets a subject that promises neither method on its own.
export const getBookingInstructionsSubject = (deliveryTypes: string[]) => {
  const pickup = deliveryTypes.filter(isPickupLed).length;

  if (pickup === deliveryTypes.length)
    return "Your Dress for Less rental is ready for pickup tomorrow 💌";
  if (pickup === 0) return "Your Dress for Less order is on its way 💌";
  return "Your Dress for Less order — pickup and delivery details 💌";
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const dressList = (items: BookingInstructionsItem[]) =>
  items.map((item) => item.dressName).join(", ");

const BookingInstructionsEmail = ({ items }: BookingInstructionsProps) => {
  const pickupItems = items.filter((item) => isPickupLed(item.deliveryType));
  const postItems = items.filter((item) => !isPickupLed(item.deliveryType));

  // Both blocks render when an order mixes methods, each headed by the dresses
  // it applies to: picking one method for the whole email would be wrong about
  // the other half of the order.
  const mixed = pickupItems.length > 0 && postItems.length > 0;
  const manyPickup = pickupItems.length > 1;
  const manyPost = postItems.length > 1;

  return (
    <Html>
      <Head />
      <Preview>
        {getBookingInstructionsSubject(items.map((item) => item.deliveryType))}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={baseUrl ? `${baseUrl}/dfl-logo.png` : DFLLogo.src}
              width="160"
              alt="Dress for Less"
              style={{ margin: "auto", display: "block" }}
            />
          </Section>
          <Hr style={hr} />

          <Section style={body}>
            <Text style={p}>Hi lovely,</Text>

            {pickupItems.length > 0 && (
              <>
                {mixed && (
                  <Text style={methodHeading}>
                    For collection: {dressList(pickupItems)}
                  </Text>
                )}
                <Text style={p}>
                  {manyPickup
                    ? "Your Dress for Less rentals have been packed and are ready for collection."
                    : "Your Dress for Less rental has been packed and is ready for collection."}
                </Text>
                <Text style={p}>
                  Pickup address:
                  <br />
                  22 Advance Way
                  <br />
                  Albany, Auckland 0632
                </Text>
                <Text style={p}>
                  {manyPickup
                    ? "Your dresses will be placed inside the container on the doorstep and labelled with your name. They will be ready to collect from 9am."
                    : "Your dress will be placed inside the container on the doorstep and labelled with your name. It will be ready to collect from 9am."}
                </Text>
                <Text style={p}>
                  Please make sure you take the bag labelled with your name and
                  check that you have the correct{" "}
                  {manyPickup ? "dresses" : "dress"} before leaving.
                </Text>
                <Text style={p}>
                  After your event, please return the{" "}
                  {manyPickup ? "dresses" : "dress"} to the same container by the
                  return date and time stated in your booking. Please place{" "}
                  {manyPickup ? "them" : "it"} securely inside the container
                  rather than leaving {manyPickup ? "them" : "it"} on the
                  doorstep. We&apos;ll also send you a return reminder with the
                  full instructions.
                </Text>
                <Text style={p}>
                  Please do not wash or dry-clean the{" "}
                  {manyPickup ? "dresses" : "dress"}, as professional cleaning is
                  included in your rental.
                </Text>
                {!mixed && (
                  <Text style={p}>
                    We hope you love your {manyPickup ? "dresses" : "dress"} and
                    have the best time at your event! Please message us if you
                    have any questions or any trouble locating your order.
                  </Text>
                )}
              </>
            )}

            {postItems.length > 0 && (
              <>
                {mixed && (
                  <Text style={methodHeading}>
                    Being posted: {dressList(postItems)}
                  </Text>
                )}
                <Text style={p}>
                  {manyPost
                    ? "Just a quick update to let you know that your Dress for Less rentals are being prepared and are due to be posted today or tomorrow via NZ Post."
                    : "Just a quick update to let you know that your Dress for Less rental is being prepared and is due to be posted today or tomorrow via NZ Post."}
                </Text>
                <Text style={p}>
                  Once your parcel has been collected and scanned into the NZ
                  Post network, you&apos;ll automatically receive a tracking
                  email directly from NZ Post. Please keep an eye on your inbox
                  and junk folder, just in case.
                </Text>
                <Text style={p}>
                  If you haven&apos;t received your tracking email by Wednesday
                  evening, please get in touch with us so we can look into it for
                  you.
                </Text>
                <Text style={p}>
                  We recommend checking your tracking throughout the week so you
                  know when to expect your parcel.
                </Text>
                <Text style={p}>
                  After your event, please return your{" "}
                  {manyPost ? "dresses" : "dress"} using the prepaid return bag
                  provided. It must be lodged at an NZ Post counter before 1pm on
                  the next working day following your event. Please do not place
                  it in a street post box, and keep your lodgement receipt as
                  proof of return. We&apos;ll also send you a separate return
                  reminder.
                </Text>
                {!mixed && (
                  <Text style={p}>
                    We can&apos;t wait for your {manyPost ? "dresses" : "dress"}{" "}
                    to arrive and hope you love {manyPost ? "them" : "it"} as
                    much as we do! Please reach out if you have any questions
                    before your event.
                  </Text>
                )}
              </>
            )}

            {mixed && (
              <Text style={p}>
                We hope you love your dresses and have the best time at your
                event! Please reach out if you have any questions or any trouble
                locating your order.
              </Text>
            )}

            <Text style={p}>
              Love,
              <br />
              Dress for Less NZ xx
            </Text>

            <Text style={ps}>
              P.S. We&apos;d love to see your photos + videos! Tag
              @dressforlessnz on Instagram or TikTok to get 10% off your next
              rent &lt;3
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={bookingCard}>
            <Text style={bookingCardTitle}>
              {items.length > 1 ? "Your order" : "Your booking"}
            </Text>
            {items.map((item, index) => {
              // Rendered only when the rental actually runs past its first day,
              // so an ordinary booking produces exactly the row it always did.
              const formattedEndDate =
                item.endDate && item.endDate !== item.dateBooked
                  ? formatDate(item.endDate)
                  : "";

              return (
                <Row
                  key={`${item.dressName}-${item.size}-${item.dateBooked}-${index}`}
                  style={index > 0 ? itemRowSpaced : undefined}
                >
                  {item.dressImage && (
                    <Column style={{ width: "140px", verticalAlign: "top" }}>
                      <Img
                        src={item.dressImage}
                        alt={item.dressName}
                        width="120"
                        style={{ borderRadius: 8, display: "block" }}
                      />
                    </Column>
                  )}
                  <Column style={{ verticalAlign: "top", paddingLeft: 16 }}>
                    <Text style={bookingDetail}>
                      <span style={bookingDetailLabel}>Dress</span>
                      <br />
                      {item.dressName}
                    </Text>
                    <Text style={bookingDetail}>
                      <span style={bookingDetailLabel}>Size</span>
                      <br />
                      {item.size}
                    </Text>
                    <Text style={bookingDetail}>
                      <span style={bookingDetailLabel}>Date</span>
                      <br />
                      {formatDate(item.dateBooked)}
                    </Text>
                    {formattedEndDate && (
                      <Text style={bookingDetail}>
                        <span style={bookingDetailLabel}>Return by</span>
                        <br />
                        {formattedEndDate}
                      </Text>
                    )}
                    <Text style={{ ...bookingDetail, marginBottom: 0 }}>
                      <span style={bookingDetailLabel}>Delivery</span>
                      <br />
                      {item.deliveryType}
                    </Text>
                  </Column>
                </Row>
              );
            })}
          </Section>

          <Hr style={hr} />
          <Section style={footerSection}>
            <Text style={footerText}>
              Dress for Less NZ - dressforlessnz.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingInstructionsEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "10px auto",
  width: "600px",
  maxWidth: "100%",
  border: "1px solid #E5E5E5",
};

const hr = {
  borderColor: "#E5E5E5",
  margin: "0",
};

const logoSection = {
  padding: "32px 40px 24px",
  textAlign: "center",
} as React.CSSProperties;

const bookingCard = {
  padding: "28px 40px",
  backgroundColor: "#fdf2f4",
};

const bookingCardTitle = {
  margin: "0 0 16px",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#881337",
} as React.CSSProperties;

const methodHeading = {
  margin: "0 0 12px",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#881337",
} as React.CSSProperties;

const itemRowSpaced = {
  borderTop: "1px solid #f3d7de",
  paddingTop: "20px",
} as React.CSSProperties;

const bookingDetail = {
  margin: "0 0 12px",
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#3c4149",
};

const bookingDetailLabel = {
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#888",
} as React.CSSProperties;

const body = {
  padding: "32px 40px",
};

const p = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#3c4149",
};

const ps = {
  ...p,
  color: "#888",
  fontSize: "13px",
  marginBottom: 0,
};

const footerSection = {
  padding: "20px 40px",
  backgroundColor: "#f9f9f9",
};

const footerText = {
  margin: "0",
  fontSize: "12px",
  color: "#AFAFAF",
  textAlign: "center",
} as React.CSSProperties;
