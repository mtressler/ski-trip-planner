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

interface MaybeReminderEmailProps {
  name: string;
  tripName: string;
  resort: string;
  startDate: string;
  endDate: string;
  organizerName: string;
  editUrl: string;
}

export function MaybeReminderEmail({
  name,
  tripName,
  resort,
  startDate,
  endDate,
  organizerName,
  editUrl,
}: MaybeReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Still on the fence about {tripName}?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Still thinking about it, {name}?</Heading>
          <Text style={text}>
            You previously said <strong>&quot;Maybe&quot;</strong> to{" "}
            <strong>{tripName}</strong> at {resort} ({startDate} – {endDate}).{" "}
            {organizerName} wanted to check in — have you had a chance to decide?
          </Text>
          <Text style={text}>
            If you&apos;re in, we&apos;d love to have you. If it&apos;s not going to
            work, no worries — just let us know so we can plan accordingly.
          </Text>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={editUrl} style={button}>
              Update Your Response
            </Link>
          </Section>
          <Text style={footer}>
            This link is unique to you and takes you directly to your previous
            response so you can update it in seconds.
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
