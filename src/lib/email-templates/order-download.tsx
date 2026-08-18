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
  productTitle?: string
  orderNumber?: string
  downloadUrl?: string
  accountUrl?: string
}

const Email = ({
  firstName,
  productTitle = 'Your guide',
  orderNumber = '',
  downloadUrl = '#',
  accountUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your download is ready — {productTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your download is ready</Heading>
        <Text style={text}>
          {firstName ? `Hi ${firstName},` : 'Hi there,'} thanks for your purchase. Your copy of{' '}
          <strong>{productTitle}</strong> is ready to download.
        </Text>
        <Button style={button} href={downloadUrl}>
          Download PDF
        </Button>
        <Text style={muted}>
          Or paste this link into your browser:
          <br />
          <Link href={downloadUrl} style={link}>
            {downloadUrl}
          </Link>
        </Text>
        <Hr style={hr} />
        {orderNumber ? <Text style={muted}>Order {orderNumber}</Text> : null}
        {accountUrl ? (
          <Text style={muted}>
            Create a free account with this email and every purchase stays in your library:{' '}
            <Link href={accountUrl} style={link}>
              Set up your account
            </Link>
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
    `Your download: ${data?.productTitle ?? 'your Easy Move Pro guide'}`,
  displayName: 'Order download',
  previewData: {
    firstName: 'Jane',
    productTitle: 'The Packing & Moving Planner Kit',
    orderNumber: 'EM-PDF-2026-83CCAD',
    downloadUrl: 'https://easymove.pro/download?t=example',
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
