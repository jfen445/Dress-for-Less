import {
  Body,
  Button,
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
import DFLLogo from "../../../../public/dfl-logo.png";

interface PasswordResetEmailProps {
  url?: string;
}

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

export const PasswordResetEmail = ({ url }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Dress for Less password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={baseUrl ? `${baseUrl}/dfl-logo.png` : DFLLogo.src}
          width="90"
          alt="Dress for Less"
          style={logo}
        />
        <Heading style={heading}>Reset your password</Heading>
        <Text style={paragraph}>
          We received a request to reset your Dress for Less password. Click the
          button below to choose a new one. This link expires in 1 hour.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={url}>
            Reset password
          </Button>
        </Section>
        <Text style={paragraph}>
          If you didn&apos;t request this, you can safely ignore this email —
          your password won&apos;t change.
        </Text>
        <Hr style={hr} />
        <Link href={baseUrl + "/account"} style={reportLink}>
          Dress for Less
        </Link>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

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

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
};

const buttonContainer = {
  padding: "27px 0 27px",
};

const button = {
  backgroundColor: "#fda4af",
  borderRadius: "3px",
  fontWeight: "600",
  color: "#fff",
  fontSize: "15px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "11px 23px",
};

const reportLink = {
  fontSize: "14px",
  color: "#b4becc",
};

const hr = {
  borderColor: "#dfe1e4",
  margin: "42px 0 26px",
};
