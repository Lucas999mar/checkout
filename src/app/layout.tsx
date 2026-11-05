import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

// Garantir URL absoluta HTTPS de produção (nunca localhost para crawlers)
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
    : 'https://app.aicheckout.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'aiCheckout | Checkout Inteligente & Entrega Automática',
    template: '%s | aiCheckout',
  },
  description:
    'Plataforma completa de checkout de alta conversão com PIX instantâneo, Cartão de Crédito e Boleto Bancário. Entrega 100% automatizada de infoprodutos via WhatsApp e E-mail.',
  applicationName: 'aiCheckout',
  authors: [{ name: 'aiCheckout' }],
  generator: 'aiCheckout',
  keywords: [
    'checkout',
    'aicheckout',
    'pix instantaneo',
    'pagamentos online',
    'infoprodutos',
    'entrega automatica',
    'whatsapp marketing',
    'venda de cursos',
  ],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    title: 'aiCheckout | Checkout Inteligente & Entrega Automática',
    description:
      'Plataforma completa de checkout de alta conversão com PIX instantâneo, Cartão de Crédito e Boleto Bancário. Entrega 100% automatizada de infoprodutos via WhatsApp e E-mail.',
    url: appUrl,
    siteName: 'aiCheckout',
    images: [
      {
        url: `${appUrl}/og-image.jpg`,
        secureUrl: `${appUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'aiCheckout - Checkout Inteligente & Entrega Automática',
      },
      {
        url: `${appUrl}/logo.jpg`,
        secureUrl: `${appUrl}/logo.jpg`,
        width: 600,
        height: 600,
        type: 'image/jpeg',
        alt: 'aiCheckout Logo',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aiCheckout | Checkout Inteligente & Entrega Automática',
    description:
      'Plataforma completa de checkout de alta conversão com PIX instantâneo, Cartão de Crédito e Boleto Bancário. Entrega 100% automatizada de infoprodutos via WhatsApp e E-mail.',
    images: [`${appUrl}/og-image.jpg`],
  },
  other: {
    'og:image:secure_url': `${appUrl}/og-image.jpg`,
    'og:image:type': 'image/jpeg',
    'og:image:width': '1200',
    'og:image:height': '630',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b132b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Metatags diretas no head para compatibilidade máxima com o scraper do WhatsApp */}
        <meta property="og:title" content="aiCheckout | Checkout Inteligente & Entrega Automática" />
        <meta
          property="og:description"
          content="Plataforma completa de checkout de alta conversão com PIX instantâneo, Cartão de Crédito e Boleto Bancário. Entrega 100% automatizada de infoprodutos via WhatsApp e E-mail."
        />
        <meta property="og:image" content={`${appUrl}/og-image.jpg`} />
        <meta property="og:image:secure_url" content={`${appUrl}/og-image.jpg`} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="aiCheckout" />
        <meta property="og:url" content={appUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="aiCheckout" />
        <meta property="og:locale" content="pt_BR" />
        <link rel="image_src" href={`${appUrl}/logo.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${appUrl}/og-image.jpg`} />
      </head>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#1e293b',
              color: '#fff',
              padding: '12px 20px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  );
}
