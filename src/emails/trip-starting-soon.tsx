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

interface TripStartingSoonEmailProps {
  name: string;
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  lodgingNotes?: string;
  checkIn?: string;
  checkOut?: string;
  tripUrl: string;
}

export function TripStartingSoonEmail({
  name,
  tripName,
  resort,
  startDate,
  endDate,
  lodgingNotes,
  checkIn,
  checkOut,
  tripUrl,
}: TripStartingSoonEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{tripName} is almost here — here&apos;s everything you need</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Get ready, {name}!</Heading>
          <Text style={text}>
            <strong>{tripName}</strong> is just 48 hours away. Here&apos;s
            everything you need to know before you hit the slopes at {resort}.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
              {checkIn && (
                <>
                  <br />
                  <strong>Check-in:</strong> {checkIn}
                </>
              )}
              {checkOut && (
                <>
                  <br />
                  <strong>Check-out:</strong> {checkOut}
                </>
              )}
            </Text>
          </Section>
          {lodgingNotes && (
            <Section style={notesBox}>
              <Text style={notesLabel}>Lodging Details</Text>
              <Text style={text}>{lodgingNotes}</Text>
            </Section>
          )}
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={tripUrl} style={button}>
              View Trip Page
            </Link>
          </Section>
          <Text style={footer}>
            You received this email because you are a confirmed participant on
            this trip.
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
  backgroundColor: "#f0f7ff",
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

const notesBox = {
  borderLeft: "3px solid #e2e8f0",
  paddingLeft: "16px",
  margin: "16px 0",
};

const notesLabel = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 8px",
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
