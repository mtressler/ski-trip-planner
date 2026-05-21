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

interface ConfirmationEmailProps {
  name: string;
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  organizerName: string;
  confirmUrl: string;
}

export function ConfirmationEmail({
  name,
  tripName,
  resort,
  startDate,
  endDate,
  organizerName,
  confirmUrl,
}: ConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re confirmed for {tripName}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;re in, {name}!</Heading>
          <Text style={text}>
            Great news — {organizerName} has confirmed your spot on{" "}
            <strong>{tripName}</strong>.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Resort:</strong> {resort}
              <br />
              <strong>Dates:</strong> {startDate} – {endDate}
            </Text>
          </Section>
          <Text style={text}>
            To complete your registration, sign in and fill out a short
            attendance form. This takes less than a minute.
          </Text>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={confirmUrl} style={button}>
              Complete Registration
            </Link>
          </Section>
          <Text style={footer}>
            If the button doesn&apos;t work, copy and paste this link into your
            browser: {confirmUrl}
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
