import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Column,
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

export interface ReturnReminderProps {
  name: string;
  dressName: string;
  dressImage: string;
  size: string;
  dateBooked: string;
  deliveryType: string;
}

const isDropOff = (deliveryType: string) =>
  deliveryType === DeliveryType.Pickup ||
  deliveryType === DeliveryType.DeliveryPickup;

export const getReturnReminderSubject = (_deliveryType: string) =>
  "Friendly reminder to return your Dress for Less rental 💌";

const ReturnReminderEmail = ({
  dressImage,
  dressName,
  deliveryType,
  size,
  dateBooked,
}: ReturnReminderProps) => {
  const dropOff = isDropOff(deliveryType);
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
        Friendly reminder to return your Dress for Less rental 💌
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

            <Text style={p}>
              We hope you had an amazing time in your Dress for Less rental!
            </Text>

            {dropOff ? (
              <>
                <Text style={p}>
                  This is a friendly reminder that your dress is due back today.
                  If you have not already returned it, please ensure it is
                  dropped off by <strong>8:00pm tonight</strong>.
                </Text>
                <Text style={p}>
                  <strong>Return address:</strong>
                  <br />
                  22 Advance Way, Albany
                </Text>
                <Text style={p}>
                  Please place your dress securely in the drop-off box located
                  at the front door. There is no need to knock or wait for
                  someone to be home.
                </Text>
              </>
            ) : (
              <>
                <Text style={p}>
                  This is a friendly reminder that your dress is due back today.
                  If you have not already returned it, please ensure it is
                  dropped off at a NZ Post branch by{" "}
                  <strong>1:00pm today</strong>.
                </Text>
                <Text style={p}>
                  <strong>Important return information:</strong>
                </Text>
                <Text style={{ ...p, marginBottom: 4 }}>
                  • Your parcel must be handed over the counter to a NZ Post
                  staff member
                </Text>
                <Text style={{ ...p, marginBottom: 4 }}>
                  • Please do not place it in a post box
                </Text>
                <Text style={p}>
                  • Be sure to obtain a receipt as proof of postage
                </Text>
              </>
            )}

            <Text style={p}>
              As outlined in our Terms &amp; Conditions, late fees may apply if
              your dress is not returned on time.
            </Text>

            <Text style={p}>
              If you experience any issues returning your{" "}
              {dropOff ? "dress" : "parcel"}, please let us know as soon as
              possible so we can assist.
            </Text>

            <Text style={p}>
              Thank you for helping us keep our dresses available for future
              customers. We hope you loved your rental and we&apos;d love to see
              any photos from your event!
            </Text>

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
                <Text style={{ ...bookingDetail, marginBottom: 0 }}>
                  <span style={bookingDetailLabel}>Date Booked</span>
                  <br />
                  {formattedDate}
                </Text>
              </Column>
            </Row>
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

export default ReturnReminderEmail;

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
