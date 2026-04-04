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

interface InterestConfirmationEmailProps {
  name: string;
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  interestLevel: string;
  editUrl: string;
}

export function InterestConfirmationEmail({
  name,
  tripName,
  resort,
  startDate,
  endDate,
  interestLevel,
  editUrl,
}: InterestConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanks for your interest in {tripName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks, {name}!</Heading>
          <Text style={text}>
            We&apos;ve received your response for <strong>{tripName}</strong>.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
              <br />
              <strong>Your response:</strong> {interestLevel}
            </Text>
          </Section>
          <Text style={text}>
            Want to change your answer? You can update your response anytime
            using the link below.
          </Text>
          <Section style={{ textAlign: "center", marginTop: "16px" }}>
            <Link href={editUrl} style={button}>
              Update Your Response
            </Link>
          </Section>
          <Text style={footer}>
            The trip organizer will follow up once responses are collected.
            You&apos;ll hear from us again when decisions are made!
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
