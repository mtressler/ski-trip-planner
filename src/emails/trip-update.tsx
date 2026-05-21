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

interface TripUpdateEmailProps {
  name: string;
  tripName: string;
  updateTitle: string;
  updateBody: string;
  tripUrl: string;
}

export function TripUpdateEmail({
  name,
  tripName,
  updateTitle,
  updateBody,
  tripUrl,
}: TripUpdateEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{updateTitle} — {tripName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>{tripName}</Text>
          <Heading style={h1}>{updateTitle}</Heading>
          <Text style={text}>Hi {name},</Text>
          <Section style={infoBox}>
            <Text style={bodyText}>{updateBody}</Text>
          </Section>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={tripUrl} style={button}>
              View Trip
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const label = {
  color: "#8898aa",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "22px",
  fontWeight: "700" as const,
  margin: "0 0 16px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const infoBox = {
  backgroundColor: "#f8fafc",
  borderLeft: "3px solid #0f172a",
  padding: "12px 16px",
  margin: "16px 0",
};

const bodyText = {
  color: "#1a1a1a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const button = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600" as const,
  padding: "11px 22px",
  textDecoration: "none",
};
