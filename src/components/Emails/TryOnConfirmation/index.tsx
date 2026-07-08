import {
  Body,
  Container,
  Head,
  Heading,
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
import DFLLogo from "../../../../public/dfl-logo-transparent.jpeg";
import { formatTryOnTimeSlot } from "../../../../common/constants/tryOn";

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

interface ITryOnConfirmation {
  name: string;
  date: string;
  timeSlot: string;
  price: number;
}

const TryOnConfirmationEmail = ({
  name,
  date,
  timeSlot,
  price,
}: ITryOnConfirmation) => (
  <Html>
    <Head />
    <Preview>Your Dress for Less try-on session is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={baseUrl ? `${baseUrl}/dfl-logo.png` : DFLLogo.src}
          width="90"
          alt="Dress for Less"
          style={logo}
        />
        <Heading style={heading}>Your try-on session is confirmed</Heading>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          Thanks for booking a try-on session with Dress for Less. Here are your
          session details:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLine}>
            <strong>Date:</strong> {dayjs(date).format("dddd, MMMM D, YYYY")}
          </Text>
          <Text style={detailLine}>
            <strong>Time:</strong> {formatTryOnTimeSlot(timeSlot)}
          </Text>
          <Text style={detailLine}>
            <strong>Try-on fee:</strong> ${price.toFixed(2)} (paid)
          </Text>
        </Section>
        <Text style={paragraph}>
          Please arrive on time at our Albany, Auckland location. If you need to
          reschedule or cancel, contact us as soon as possible.
        </Text>
        <Hr style={hr} />
        <Heading as="h2" style={subHeading}>
          Try-On Terms & Conditions
        </Heading>
        <Text style={smallParagraph}>
          The $15 try-on fee is non-refundable and does not go towards any
          rental. Please arrive within 10 minutes of your slot &mdash; if you
          are more than 15 minutes late without notice, your session may be
          treated as a no-show and the fee forfeited. Sessions can be
          rescheduled free of charge if you contact us at least 24 hours in
          advance. For our full terms, please visit{" "}
          <Link href={`${baseUrl}/policies`} style={inlineLink}>
            our terms and conditions page
          </Link>
          .
        </Text>
        <Hr style={hr} />
        <Link href={baseUrl + "/account"} style={reportLink}>
          Dress for Less
        </Link>
      </Container>
    </Body>
  </Html>
);

export default TryOnConfirmationEmail;

const logo = {
  borderRadius: 0,
  width: 90,
  height: "auto",
};

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "400",
  color: "#484848",
  padding: "17px 0 0",
};

const subHeading = {
  fontSize: "18px",
  lineHeight: "1.3",
  fontWeight: "600",
  color: "#484848",
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
};

const smallParagraph = {
  margin: "0 0 15px",
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#747474",
};

const detailsBox = {
  backgroundColor: "#f7f7f7",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "20px 0",
};

const detailLine = {
  margin: "4px 0",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
};

const inlineLink = {
  color: "#fda4af",
  textDecoration: "underline",
};

const reportLink = {
  fontSize: "14px",
  color: "#b4becc",
};

const hr = {
  borderColor: "#dfe1e4",
  margin: "42px 0 26px",
};
