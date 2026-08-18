import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click
          the button below to choose a new password.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
