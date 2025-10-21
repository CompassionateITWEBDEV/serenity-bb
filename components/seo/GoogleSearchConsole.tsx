"use client"

import Head from "next/head"

interface GoogleSearchConsoleProps {
  verificationCode?: string
}

export default function GoogleSearchConsole({ verificationCode }: GoogleSearchConsoleProps) {
  if (!verificationCode) return null

  return (
    <Head>
      <meta name="google-site-verification" content={verificationCode} />
    </Head>
  )
}

// Alternative method using meta tag in layout
export function GoogleSearchConsoleMeta({ verificationCode }: GoogleSearchConsoleProps) {
  if (!verificationCode) return null

  return (
    <meta name="google-site-verification" content={verificationCode} />
  )
}
