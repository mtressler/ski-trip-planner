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

interface InviteDeadlineReminderEmailProps {
  name: string;
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  deadlineDate: string;
  inviteUrl: string;
}

export function InviteDeadlineReminderEmail({
  name,
  tripName,
  resort,
  startDate,
  endDate,
  deadlineDate,
  inviteUrl,
}: InviteDeadlineReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Last chance: {tripName} interest form closes in 48 hours</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Last Chance, {name}!</Heading>
          <Text style={text}>
            The interest form for <strong>{tripName}</strong> closes in{" "}
            <strong>48 hours</strong> on {deadlineDate}. Make sure your
            response is submitted.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
              <br />
              <strong>Deadline:</strong> {deadlineDate}
            </Text>
          </Section>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={inviteUrl} style={button}>
              Update My Response
            </Link>
          </Section>
          <Text style={footer}>
            You received this because you expressed interest in this trip.
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
  backgroundColor: "#fffbeb",
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
