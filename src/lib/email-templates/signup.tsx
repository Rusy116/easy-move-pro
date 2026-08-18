import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Instrument Sans', Helvetica, Arial, sans-serif" }
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px 40px',
  border: '1px solid #e6e4dd',
  borderRadius: '16px',
  backgroundColor: '#fbfaf6',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1f2a24',
  fontFamily: "Georgia, 'Times New Roman', serif",
  letterSpacing: '-0.02em',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#4b544e',
  lineHeight: '1.6',
  margin: '0 0 22px',
}
const link = { color: '#3a5346', textDecoration: 'underline' }
const button = {
  backgroundColor: '#3a5346',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#8b918a', margin: '32px 0 0', lineHeight: '1.5' }
