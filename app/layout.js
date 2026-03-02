export const metadata = {
  title: 'Book Club — Staying Up with Taryn & Cammie',
  description: 'Submit and vote on books for the Staying Up podcast book club.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
