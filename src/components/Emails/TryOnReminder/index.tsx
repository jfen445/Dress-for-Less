import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import dayjs from "dayjs";
import DFLLogo from "../../.../../../../public/dfl-logo.png";
import { formatTryOnTimeSlot } from "../../../../common/constants/tryOn";

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

export interface TryOnReminderProps {
  name: string;
  date: string;
  timeSlot: string;
}

export const getTryOnReminderSubject = () =>
  "Reminder: your Dress for Less try-on appointment is coming up 💌";

const TryOnReminderEmail = ({ name, date, timeSlot }: TryOnReminderProps) => {
  const formattedDate = dayjs(date).format("dddd, D MMMM YYYY");

  return (
    <Html>
      <Head />
      <Preview>
        Your Dress for Less try-on appointment is coming up soon 💌
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
              Just a reminder that your Dress for Less try-on appointment is
              coming up soon!
            </Text>

            <Section style={detailsBox}>
              <Text style={detailLine}>
                <strong>Date:</strong> {formattedDate}
              </Text>
              <Text style={detailLine}>
                <strong>Time:</strong> {formatTryOnTimeSlot(timeSlot)}
              </Text>
              <Text style={{ ...detailLine, marginBottom: 0 }}>
                <strong>Address:</strong>
                <br />
                22 Advance Way
                <br />
                Albany, Auckland 0632
              </Text>
            </Section>

            <Text style={p}>
              As we often have back-to-back appointments, please arrive as
              close to your scheduled time as possible. When you arrive,
              please wait at the front door or in your car and we&apos;ll let
              you in as soon as we&apos;re ready for you.
            </Text>
            <Text style={p}>
              Please avoid arriving early, as another customer may still be
              finishing their appointment. Late arrivals may also result in a
              shorter session if another appointment is booked after yours.
            </Text>
            <Text style={p}>
              Before attending, please read through our{" "}
              <Link href={`${baseUrl}/policies`} style={link}>
                Try-On Policies
              </Link>{" "}
              on the booking page. These include important information about
              appointment timing, hygiene requirements, garment care, bringing
              guests and your $10 rental credit.
            </Text>
            <Text style={p}>
              As a quick reminder, please arrive with no makeup or fresh fake
              tan, and avoid wearing lotions, oils or anything that may
              transfer onto the dresses.
            </Text>
            <Text style={p}>
              If there are any specific dresses you would like to try, please
              check with us beforehand. Rental bookings take priority, so we
              cannot guarantee that every requested dress will be available on
              the day.
            </Text>
            <Text style={p}>
              After attending your appointment, you&apos;ll receive a $10
              credit to use towards a rental. The credit will be added to your
              account and must be used within 48 hours. Dresses are not held
              following a try-on and remain available for other customers to
              book until your order is confirmed.
            </Text>
            <Text style={p}>
              Please message us as soon as possible if you are running late,
              need to reschedule or have any trouble finding the address.
            </Text>
            <Text style={p}>We&apos;re looking forward to seeing you!</Text>

            <Text style={p}>
              Love,
              <br />
              Dress for Less NZ xx
            </Text>
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

export default TryOnReminderEmail;

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

const detailsBox = {
  backgroundColor: "#fdf2f4",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "0 0 18px",
};

const detailLine = {
  margin: "0 0 12px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#3c4149",
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
