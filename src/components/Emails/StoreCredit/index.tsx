import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import dayjs from "dayjs";
import DFLLogo from "../../.../../../../public/dfl-logo.png";

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

export interface StoreCreditProps {
  name: string;
  email: string;
  creditAmount: number;
  reason: string;
  expiryDate: string;
}

export const getStoreCreditSubject = () =>
  "Your Dress for Less credit has been issued 💌";

const StoreCreditEmail = ({
  name,
  email,
  creditAmount,
  reason,
  expiryDate,
}: StoreCreditProps) => {
  const formattedAmount = creditAmount.toFixed(2);
  const formattedExpiry = dayjs(expiryDate).format("MMMM D, YYYY h:mma");

  return (
    <Html>
      <Head />
      <Preview>Your credit has been issued 💌</Preview>
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
            <Text style={p}>Hi {name},</Text>

            <Text style={p}>
              We&apos;ve added ${formattedAmount} in Dress for Less credit to
              your account.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailLine}>
                <strong>Credit amount:</strong> ${formattedAmount}
              </Text>
              <Text style={detailLine}>
                <strong>Reason:</strong> {reason}
              </Text>
              <Text style={{ ...detailLine, marginBottom: 0 }}>
                <strong>Expiry:</strong> {formattedExpiry}
              </Text>
            </Section>

            <Text style={p}>
              Your credit is linked to the email address used for your account
              and will be available to apply at checkout when you make your
              next booking.
            </Text>

            <Text style={p}>Please note:</Text>
            <Text style={{ ...p, marginBottom: 4 }}>
              • Credit can only be used towards a Dress for Less rental.
            </Text>
            <Text style={{ ...p, marginBottom: 4 }}>
              • Credit cannot be exchanged for cash or transferred to another
              account.
            </Text>
            <Text style={{ ...p, marginBottom: 4 }}>
              • Any remaining balance will be subject to the conditions shown
              at checkout.
            </Text>
            <Text style={{ ...p, marginBottom: 4 }}>
              • Your booking is not secured until your order has been
              completed and confirmed.
            </Text>
            <Text style={p}>
              • Credit must be used before the expiry date shown above, where
              applicable.
            </Text>

            <Text style={p}>
              Please make sure you are logged in using <strong>{email}</strong>{" "}
              when making your booking. If your credit does not appear at
              checkout, contact us before completing your order so we can
              assist.
            </Text>

            <Text style={p}>We hope to dress you again soon!</Text>

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

export default StoreCreditEmail;

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
