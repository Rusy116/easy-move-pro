import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  firstName?: string | null
  amountLabel?: string
  quoteNumber?: string
  quoteUrl?: string
  accountUrl?: string
}

const Email = ({
  firstName,
  amountLabel = '',
  quoteNumber = '',
  quoteUrl = '#',
  accountUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your moving estimate {amountLabel}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your moving estimate</Heading>
        <Text style={text}>
          {firstName ? `Hi ${firstName},` : 'Hi there,'} here is your instant estimate
          {amountLabel ? (
            <>
              : <strong>{amountLabel}</strong>
            </>
          ) : null}
          .
        </Text>
        <Button style={button} href={quoteUrl}>
          View your estimate
        </Button>
        <Text style={muted}>
          <Link href={quoteUrl} style={link}>
            {quoteUrl}
          </Link>
        </Text>
        <Hr style={hr} />
        {quoteNumber ? <Text style={muted}>Quote {quoteNumber}</Text> : null}
        {accountUrl ? (
          <Text style={muted}>
            <Link href={accountUrl} style={link}>
              Create an account
            </Link>{' '}
            to track your move.
          </Text>
        ) : null}
        <Text style={muted}>Easy Move Pro — moving made simple.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.amountLabel
      ? `Your moving estimate: ${data.amountLabel}`
      : 'Your moving estimate',
  displayName: 'Moving estimate',
  previewData: {
    firstName: 'Jane',
    amountLabel: '$1,850',
    quoteNumber: 'EM-2026-1042',
    quoteUrl: 'https://easymove.pro/quote/EM-2026-1042',
    accountUrl: 'https://easymove.pro/auth?signup=1',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '26px', color: '#3A5346', margin: '0 0 16px' }
const text = { fontSize: '16px', lineHeight: '26px', color: '#20302a' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#6b7a72' }
const link = { color: '#3A5346' }
const hr = { borderColor: '#e3e8e5', margin: '24px 0' }
const button = {
  backgroundColor: '#3A5346',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '14px 28px',
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 16px',
}
