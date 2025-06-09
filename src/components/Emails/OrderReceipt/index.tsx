import {
  Body,
  Column,
  Container,
  Head,
  Heading,
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
import DFLLogo from "../../.../../../../public/dfl-logo-transparent.jpeg";
import { OrderReceipt } from "../../../../common/types";
import dayjs from "dayjs";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

interface IOrderReceipt {
  orderReceipt: OrderReceipt;
}

const OrderReceiptEmail = ({ orderReceipt }: IOrderReceipt) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>Your Dress for Less order is on its way!</Preview>
      <Container style={container}>
        <Hr style={global.hr} />
        <Section style={message}>
          <Img
            src={DFLLogo.src}
            width="66"
            height="22"
            alt="Dres for Less"
            style={{ margin: "auto" }}
          />
          <Heading style={global.heading}>
            Your dress has been confimred
          </Heading>
          <Text style={global.text}>
            You order is on its way. Use the link above to track its progress.
          </Text>
          <Text style={{ ...global.text, marginTop: 24 }}>
            Thank you for booking with Dress for Less. We hope you have a
            wonderful time at your event and enjoy wearing your chosen dress. If
            you have any questions or need assistance, our team is here to help.
          </Text>
        </Section>
        <Hr style={global.hr} />
        <Section style={global.defaultPadding}>
          <Text style={adressTitle}>Shipping to: {orderReceipt.name}</Text>
          <Text style={{ ...global.text, fontSize: 14 }}>
            {orderReceipt.address}, {orderReceipt.city}
          </Text>
        </Section>
        <Hr style={global.hr} />
        <Section
          style={{ ...paddingX, paddingTop: "40px", paddingBottom: "40px" }}
        >
          <Row>
            <Column>
              <Img
                src={orderReceipt.dressImage}
                alt={orderReceipt.dressName}
                style={{ float: "left" }}
                width="260px"
              />
            </Column>
            <Column style={{ verticalAlign: "top", paddingLeft: "12px" }}>
              <Text style={{ ...paragraph, fontWeight: "500" }}>
                {orderReceipt.dressName}
              </Text>
              <Text style={global.text}>Size {orderReceipt.size}</Text>
            </Column>
          </Row>
        </Section>
        <Hr style={global.hr} />
        <Section style={global.defaultPadding}>
          <Row style={{ display: "inline-flex", marginBottom: 40 }}>
            {/* <Column style={{ width: "170px" }}>
              <Text style={global.paragraphWithBold}>Order Number</Text>
              <Text style={track.number}>C0106373851</Text>
            </Column> */}
            <Column>
              <Text style={global.paragraphWithBold}>Booked for</Text>
              <Text style={track.number}>
                {dayjs(orderReceipt.dateBooked).format("MMMM D, YYYY")}
              </Text>
            </Column>
          </Row>
          {/* <Row>
            <Column align="center">
              <Link style={global.button}>Order Status</Link>
            </Column>
          </Row> */}
        </Section>
      </Container>
    </Body>
  </Html>
);

export default OrderReceiptEmail;

const paddingX = {
  paddingLeft: "40px",
  paddingRight: "40px",
};

const paddingY = {
  paddingTop: "22px",
  paddingBottom: "22px",
};

const paragraph = {
  margin: "0",
  lineHeight: "2",
};

const global = {
  paddingX,
  paddingY,
  defaultPadding: {
    ...paddingX,
    ...paddingY,
  },
  paragraphWithBold: { ...paragraph, fontWeight: "bold" },
  heading: {
    fontSize: "32px",
    lineHeight: "1.3",
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: "-1px",
  } as React.CSSProperties,
  text: {
    ...paragraph,
    color: "#747474",
    fontWeight: "500",
  },
  button: {
    border: "1px solid #929292",
    fontSize: "16px",
    textDecoration: "none",
    padding: "10px 0px",
    width: "220px",
    display: "block",
    textAlign: "center",
    fontWeight: 500,
    color: "#000",
  } as React.CSSProperties,
  hr: {
    borderColor: "#E5E5E5",
    margin: "0",
  },
};

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

const track = {
  container: {
    padding: "22px 40px",
    backgroundColor: "#F7F7F7",
  },
  number: {
    margin: "12px 0 0 0",
    fontWeight: 500,
    lineHeight: "1.4",
    color: "#6F6F6F",
  },
};

const message = {
  padding: "40px 74px",
  textAlign: "center",
} as React.CSSProperties;

const adressTitle = {
  ...paragraph,
  fontSize: "15px",
  fontWeight: "bold",
};

const recomendationsText = {
  margin: "0",
  fontSize: "15px",
  lineHeight: "1",
  paddingLeft: "10px",
  paddingRight: "10px",
};

const recomendations = {
  container: {
    padding: "20px 0",
  },
  product: {
    verticalAlign: "top",
    textAlign: "left" as const,
    paddingLeft: "2px",
    paddingRight: "2px",
  },
  title: { ...recomendationsText, paddingTop: "12px", fontWeight: "500" },
  text: {
    ...recomendationsText,
    paddingTop: "4px",
    color: "#747474",
  },
};

const menu = {
  container: {
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: "20px",
    backgroundColor: "#F7F7F7",
  },
  content: {
    ...paddingY,
    paddingLeft: "20px",
    paddingRight: "20px",
  },
  title: {
    paddingLeft: "20px",
    paddingRight: "20px",
    fontWeight: "bold",
  },
  text: {
    fontSize: "13.5px",
    marginTop: 0,
    fontWeight: 500,
    color: "#000",
  },
  tel: {
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: "32px",
    paddingBottom: "22px",
  },
};

const categories = {
  container: {
    width: "370px",
    margin: "auto",
    paddingTop: "12px",
  },
  text: {
    fontWeight: "500",
    color: "#000",
  },
};

const footer = {
  policy: {
    width: "166px",
    margin: "auto",
  },
  text: {
    margin: "0",
    color: "#AFAFAF",
    fontSize: "13px",
    textAlign: "center",
  } as React.CSSProperties,
};
