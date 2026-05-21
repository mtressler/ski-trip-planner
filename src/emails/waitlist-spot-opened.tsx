import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WaitlistSpotOpenedEmailProps {
  name: string;
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  organizerName: string;
  tripUrl: string;
}

export function WaitlistSpotOpenedEmail({
  name,
  tripName,
  resort,
  startDate,
  endDate,
  organizerName,
  tripUrl,
}: WaitlistSpotOpenedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>A spot opened up on {tripName}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Great news, {name}!</Heading>
          <Text style={text}>
            A spot just opened up on <strong>{tripName}</strong> and you&apos;re
            next on the waitlist. {organizerName} has confirmed your spot!
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
            </Text>
          </Section>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={tripUrl} style={button}>
              View Your Trip
            </Link>
          </Section>
          <Text style={footer}>
            You were on the waitlist for this trip. This confirmation was sent
            automatically when a spot became available.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0 0 16px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const infoBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "6px",
  padding: "16px",
  margin: "16px 0",
};

const infoText = {
  color: "#1a1a1a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const button = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  marginTop: "24px",
};
