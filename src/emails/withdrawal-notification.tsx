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

interface WithdrawalNotificationEmailProps {
  organizerName: string;
  memberName: string;
  tripName: string;
  reason?: string;
  attendeesUrl: string;
}

export function WithdrawalNotificationEmail({
  organizerName,
  memberName,
  tripName,
  reason,
  attendeesUrl,
}: WithdrawalNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{memberName} has withdrawn from {tripName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Withdrawal Notice</Heading>
          <Text style={text}>
            Hi {organizerName}, just a heads up — <strong>{memberName}</strong>{" "}
            has withdrawn from <strong>{tripName}</strong>.
          </Text>
          {reason && (
            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>Reason:</strong> {reason}
              </Text>
            </Section>
          )}
          <Text style={text}>
            You may want to review your attendee list and confirm any waitlisted
            participants.
          </Text>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={attendeesUrl} style={button}>
              View Attendees
            </Link>
          </Section>
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
  backgroundColor: "#fef9ec",
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
