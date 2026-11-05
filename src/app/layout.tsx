import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.aicheckout.com.br';

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
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'aiCheckout - Checkout Inteligente & Entrega Automática',
      },
      {
        url: '/logo.png',
        width: 512,
        height: 512,
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
    images: ['/og-image.png'],
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
