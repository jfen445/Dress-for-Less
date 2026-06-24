import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type * as React from "react";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { Address } from "../../../../common/types";
import DFLLogo from "../../.../../../../public/dfl-logo.png";

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

export interface BookingInstructionsProps {
  name: string;
  dressName: string;
  dressImage: string;
  size: string;
  dateBooked: string;
  deliveryType: string;
  address?: Address;
}

const isPickupLed = (deliveryType: string) =>
  deliveryType === DeliveryType.Pickup ||
  deliveryType === DeliveryType.PickupDelivery;

export const getBookingInstructionsSubject = (deliveryType: string) =>
  isPickupLed(deliveryType)
    ? "Your Dress for Less rental is ready for pickup tomorrow 💌"
    : "Your Dress for Less order is on its way 💌";

const BookingInstructionsEmail = ({
  dressImage,
  dressName,
  deliveryType,
  size,
  dateBooked,
}: BookingInstructionsProps) => {
  const pickup = isPickupLed(deliveryType);
  const formattedDate = new Date(dateBooked).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Html>
      <Head />
      <Preview>
        {pickup
          ? "Your Dress for Less rental is ready for pickup tomorrow 💌"
          : "Your Dress for Less order is on its way 💌"}
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

            {pickup ? (
              <>
                <Text style={p}>
                  Just a quick reminder that your Dress for Less rental will be
                  ready for pickup tomorrow from 9:00am onwards.
                </Text>
                <Text style={p}>
                  Pickup is from <strong>22 Advance Way, Albany</strong>. Your
                  dress will be placed at the front door in a garment bag with
                  your name on it, so you can collect it at a time that suits
                  you.
                </Text>
                <Text style={p}>
                  We recommend picking up your dress as early as possible and
                  trying it on shortly after collection to ensure everything is
                  perfect for your event. If there are any issues, please let us
                  know as soon as possible and we&apos;ll do our best to help.
                </Text>
                <Text style={p}>
                  After your event, please remember to return your dress by the
                  agreed return date and time outlined in our Terms &amp;
                  Conditions.
                </Text>
                <Text style={p}>
                  We can&apos;t wait for you to wear your dress and hope you
                  have an amazing time at your event!
                </Text>
              </>
            ) : (
              <>
                <Text style={p}>
                  Just a quick update to let you know that your Dress for Less
                  rental is on its way soon!
                </Text>
                <Text style={p}>
                  Your dress is scheduled to be posted today or tomorrow via NZ
                  Post. Once your parcel has been scanned into the NZ Post
                  network, you will automatically receive a tracking email
                  directly from NZ Post.
                </Text>
                <Text style={p}>
                  Please keep an eye on your inbox (and junk folder just in
                  case). If you have not received a tracking email by Wednesday
                  evening, please get in touch with us and we&apos;ll look into
                  it for you.
                </Text>
                <Text style={p}>
                  We recommend keeping an eye on the tracking throughout the
                  week so you know exactly when your parcel will arrive.
                </Text>
                <Text style={p}>
                  Once you&apos;ve enjoyed your event, please remember to return
                  your dress by the agreed return date and time outlined in our
                  Terms &amp; Conditions. Return instructions can be found on
                  our{" "}
                  <Link href={`${baseUrl}/policies`} style={link}>
                    website
                  </Link>
                  .
                </Text>
                <Text style={p}>
                  If you have any questions before your event, don&apos;t
                  hesitate to reach out - we&apos;re always happy to help.
                </Text>
                <Text style={p}>
                  We can&apos;t wait for you to receive your dress and hope you
                  love it as much as we do!
                </Text>
              </>
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
            <Text style={bookingCardTitle}>Your booking</Text>
            <Row>
              {dressImage && (
                <Column style={{ width: "140px", verticalAlign: "top" }}>
                  <Img
                    src={dressImage}
                    alt={dressName}
                    width="120"
                    style={{ borderRadius: 8, display: "block" }}
                  />
                </Column>
              )}
              <Column style={{ verticalAlign: "top", paddingLeft: 16 }}>
                <Text style={bookingDetail}>
                  <span style={bookingDetailLabel}>Dress</span>
                  <br />
                  {dressName}
                </Text>
                <Text style={bookingDetail}>
                  <span style={bookingDetailLabel}>Size</span>
                  <br />
                  {size}
                </Text>
                <Text style={bookingDetail}>
                  <span style={bookingDetailLabel}>Date</span>
                  <br />
                  {formattedDate}
                </Text>
                <Text style={{ ...bookingDetail, marginBottom: 0 }}>
                  <span style={bookingDetailLabel}>Delivery</span>
                  <br />
                  {deliveryType}
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />
          <Section style={footerSection}>
            <Text style={footerText}>
              Dress for Less NZ — dressforlessnz.com
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

const link = {
  color: "#fda4af",
  textDecoration: "underline",
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
