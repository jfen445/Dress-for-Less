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
import DFLLogo from "../../.../../../../public/dfl-logo.png";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { OrderReceipt } from "../../../../common/types";
import dayjs from "dayjs";

const baseUrl = process.env.NEXT_BASE_URL
  ? `${process.env.NEXT_BASE_URL}`
  : "www.dressforlessnz.com";

interface IOrderReceipt {
  orderReceipt: OrderReceipt[];
}

const isPickupLed = (deliveryType: string) =>
  deliveryType === DeliveryType.Pickup ||
  deliveryType === DeliveryType.PickupDelivery;

const deliveryMethodLabel = (deliveryType: string) =>
  isPickupLed(deliveryType) ? "Albany pickup" : "Postage";

const OrderReceiptEmail = ({ orderReceipt }: IOrderReceipt) => {
  const orderDetails = orderReceipt[0];
  const pickup = isPickupLed(orderDetails.deliveryType);

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>Your Dress for Less booking is confirmed</Preview>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={baseUrl ? `${baseUrl}/dfl-logo.png` : DFLLogo.src}
              width="160"
              height="22"
              alt="Dress for Less"
              style={{ margin: "auto", display: "block" }}
            />
          </Section>
          <Hr style={hr} />

          <Section style={body}>
            <Text style={heading}>Your booking is confirmed</Text>
            <Text style={p}>
              Thank you for booking with Dress for Less! Your dress has been
              secured for your selected event date.
            </Text>
            {pickup ? (
              <Text style={p}>
                Please check your dress, size and event date below. If
                anything is incorrect, please contact us as soon as possible
                so we can update your booking.
              </Text>
            ) : (
              <Text style={p}>
                Please check your dress, size, event date and delivery
                address below. If anything is incorrect, please contact us as
                soon as possible so we can update your booking.
              </Text>
            )}
            {pickup ? (
              <Text style={p}>
                We&apos;ll email your pickup instructions the day before your
                dress is available for collection. This will include the
                Albany pickup address, collection time and return
                information.
              </Text>
            ) : (
              <Text style={p}>
                We&apos;ll prepare and dispatch your order during the week of
                your event. Once your parcel has been scanned by NZ Post,
                you&apos;ll receive an email with your tracking information.
              </Text>
            )}
            <Text style={p}>
              We hope you have an amazing time at your event and love wearing
              your chosen dress! For any questions about your booking, please
              get in touch with us.
            </Text>
          </Section>

          {!pickup && orderDetails.address && (
            <>
              <Hr style={hr} />
              <Section style={body}>
                <Text style={sectionTitle}>Delivery address</Text>
                <Text style={addressText}>{orderDetails.name}</Text>
                {orderDetails.address.company && (
                  <Text style={addressText}>
                    {orderDetails.address.company}
                  </Text>
                )}
                <Text style={addressText}>
                  {orderDetails.address.apartment
                    ? `${orderDetails.address.apartment}/${orderDetails.address.address}`
                    : orderDetails.address.address}
                </Text>
                <Text style={addressText}>
                  {orderDetails.address.suburb}, {orderDetails.address.city}{" "}
                  {orderDetails.address.postCode}
                </Text>
                <Text style={addressText}>{orderDetails.address.country}</Text>
              </Section>
            </>
          )}

          {orderReceipt.map((item) => (
            <>
              <Hr style={hr} />
              <Section style={bookingCard}>
                <Row>
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
                      <span style={bookingDetailLabel}>Event date</span>
                      <br />
                      {dayjs(item.dateBooked).format("dddd, D MMMM YYYY")}
                    </Text>
                    <Text style={{ ...bookingDetail, marginBottom: 0 }}>
                      <span style={bookingDetailLabel}>Delivery method</span>
                      <br />
                      {deliveryMethodLabel(item.deliveryType)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            </>
          ))}
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

export default OrderReceiptEmail;

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

const heading = {
  margin: "0 0 18px",
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#000",
};

const p = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#3c4149",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#881337",
} as React.CSSProperties;

const addressText = {
  margin: "0 0 4px",
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#3c4149",
};

const bookingCard = {
  padding: "28px 40px",
  backgroundColor: "#fdf2f4",
};

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
