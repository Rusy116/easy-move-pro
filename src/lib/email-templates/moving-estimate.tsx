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
  fullName?: string | null
  amountLabel?: string
  quoteNumber?: string
  originLabel?: string | null
  destinationLabel?: string | null
  moveDateLabel?: string | null
  moveSizeLabel?: string | null
  distanceLabel?: string | null
  servicesLabel?: string | null
  quoteUrl?: string
  accountUrl?: string
  loginUrl?: string
}

const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <Text style={row}>
      <span style={rowLabel}>{label}</span>
      <span>{value}</span>
    </Text>
  ) : null

const Email = ({
  firstName,
  fullName,
  amountLabel = '',
  quoteNumber = '',
  originLabel,
  destinationLabel,
  moveDateLabel,
  moveSizeLabel,
  distanceLabel,
  servicesLabel,
  quoteUrl = '#',
  accountUrl,
  loginUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your moving request {quoteNumber}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>We received your moving request</Heading>
        <Text style={text}>
          {firstName ? `Hi ${firstName},` : 'Hi there,'} thanks for your request — it is in our
          system and our team is reviewing it now.
          {amountLabel ? (
            <>
              {' '}
              Your instant estimate is <strong>{amountLabel}</strong>.
            </>
          ) : null}
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
        <Row label="Request ID" value={quoteNumber} />
        <Row label="Name" value={fullName} />
        <Row label="Moving from" value={originLabel} />
        <Row label="Moving to" value={destinationLabel} />
        <Row label="Requested move date" value={moveDateLabel} />
        <Row label="Move size" value={moveSizeLabel} />
        <Row label="Distance" value={distanceLabel} />
        <Row label="Services" value={servicesLabel} />
        <Hr style={hr} />
        <Text style={text}>
          Register with this email address to track your request, message your assigned mover and
          review your final price in the Easy Move Pro customer portal.
        </Text>
        {accountUrl ? (
          <Text style={muted}>
            <Link href={accountUrl} style={link}>
              Create your account
            </Link>
          </Text>
        ) : null}
        {loginUrl ? (
          <Text style={muted}>
            Already registered?{' '}
            <Link href={loginUrl} style={link}>
              Log in to your account
            </Link>
            .
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
    data?.quoteNumber
      ? `Moving request received — ${data.quoteNumber}`
      : 'Moving request received',
  displayName: 'Moving request received',
  previewData: {
    firstName: 'Jane',
    fullName: 'Jane Cooper',
    amountLabel: '$1,850 – $2,240',
    quoteNumber: 'EM-2026-1042',
    originLabel: 'Austin, TX 78701',
    destinationLabel: 'Denver, CO 80202',
    moveDateLabel: 'September 12, 2026',
    moveSizeLabel: '2 bedrooms',
    distanceLabel: '925 miles',
    servicesLabel: 'Packing, Storage',
    quoteUrl: 'https://easymove.pro/portal/EM-2026-1042',
    accountUrl: 'https://easymove.pro/auth?signup=1',
    loginUrl: 'https://easymove.pro/auth',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '26px', color: '#3A5346', margin: '0 0 16px' }
const text = { fontSize: '16px', lineHeight: '26px', color: '#20302a' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#6b7a72' }
const row = { fontSize: '14px', lineHeight: '22px', color: '#20302a', margin: '0 0 6px' }
const rowLabel = { color: '#6b7a72', display: 'inline-block', minWidth: '150px' }
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
