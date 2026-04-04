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

interface InvitationEmailProps {
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  organizerName: string;
  inviteUrl: string;
  customMessage?: string;
}

export function InvitationEmail({
  tripName,
  resort,
  startDate,
  endDate,
  organizerName,
  inviteUrl,
  customMessage,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to {tripName}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;re Invited!</Heading>
          <Text style={text}>
            <strong>{organizerName}</strong> has invited you to{" "}
            <strong>{tripName}</strong> at {resort}.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
            </Text>
          </Section>
          {customMessage && (
            <Section style={messageBox}>
              <Text style={text}>
                <em>Message from {organizerName}:</em>
              </Text>
              <Text style={text}>{customMessage}</Text>
            </Section>
          )}
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={inviteUrl} style={button}>
              Let us know if you&apos;re interested
            </Link>
          </Section>
          <Text style={footer}>
            This link is unique to you. You can use it to update your response
            at any time.
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

const messageBox = {
  borderLeft: "3px solid #e2e8f0",
  paddingLeft: "16px",
  margin: "16px 0",
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
