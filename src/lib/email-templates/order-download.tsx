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
  paymentRef?: string | null
  amountLabel?: string | null
  downloadUrl?: string
  accountUrl?: string
  loginUrl?: string
}

const Email = ({
  firstName,
  productTitle = 'Your guide',
  orderNumber = '',
  paymentRef,
  amountLabel,
  downloadUrl = '#',
  accountUrl,
  loginUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment confirmed — {productTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment confirmed</Heading>
        <Text style={text}>
          {firstName ? `Hi ${firstName},` : 'Hi there,'} thanks for your purchase. Your copy of{' '}
          <strong>{productTitle}</strong> is ready to download.
        </Text>
        <Button style={button} href={downloadUrl}>
          Download your PDF
        </Button>
        <Text style={muted}>
          Or paste this secure link into your browser:
          <br />
          <Link href={downloadUrl} style={link}>
            {downloadUrl}
          </Link>
        </Text>
        <Hr style={hr} />
        {orderNumber ? <Text style={muted}>Order reference: {orderNumber}</Text> : null}
        {paymentRef ? <Text style={muted}>Payment reference: {paymentRef}</Text> : null}
        {amountLabel ? <Text style={muted}>Amount paid: {amountLabel}</Text> : null}
        <Hr style={hr} />
        {accountUrl || loginUrl ? (
          <>
            <Text style={text}>
              Create your account and keep all your purchases in one place.
            </Text>
            {accountUrl ? (
              <Button style={button} href={accountUrl}>
                Create your account
              </Button>
            ) : null}
            {loginUrl ? (
              <>
                {accountUrl ? <br /> : null}
                <Button style={secondaryButton} href={loginUrl}>
                  Log in
                </Button>
              </>
            ) : null}
            <Text style={muted}>
              Use this same email address and every purchase stays in your library.
            </Text>
          </>
        ) : null}
        <Text style={muted}>Easy Move Pro — moving made simple.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Your purchase is ready: ${data?.productTitle ?? 'your Easy Move Pro guide'}`,
  displayName: 'Order download',
  previewData: {
    firstName: 'Jane',
    productTitle: 'The Packing & Moving Planner Kit',
    orderNumber: 'EM-PDF-2026-83CCAD',
    paymentRef: 'pi_3Qexample',
    amountLabel: '$19',
    downloadUrl: 'https://easymove.pro/download?t=example',
    accountUrl: 'https://easymove.pro/auth?signup=1',
    loginUrl: 'https://easymove.pro/auth',
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
const secondaryButton = {
  backgroundColor: '#ffffff',
  color: '#3A5346',
  border: '1px solid #3A5346',
  borderRadius: '999px',
  padding: '13px 28px',
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 0 16px',
}
