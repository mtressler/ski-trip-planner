import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface TripCancelledEmailProps {
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  organizerName: string;
}

export function TripCancelledEmail({
  tripName,
  resort,
  startDate,
  endDate,
  organizerName,
}: TripCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{tripName} has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Trip Cancelled</Heading>
          <Text style={text}>
            We&apos;re sorry to let you know that <strong>{tripName}</strong>{" "}
            has been cancelled by the organizer, {organizerName}.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
            </Text>
          </Section>
          <Text style={text}>
            If you have any questions, please reach out to {organizerName}{" "}
            directly.
          </Text>
          <Text style={footer}>
            You received this email because you expressed interest in or
            confirmed attendance for this trip.
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
  backgroundColor: "#fff1f0",
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

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  marginTop: "24px",
};
