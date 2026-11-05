import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
    : 'https://app.aicheckout.com.br';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { slug: params.slug },
      include: { product: true, price: true },
    });

    if (!link) {
      return {
        title: 'Checkout Seguro | aiCheckout',
        description: 'Finalize sua compra com segurança via PIX ou Cartão no aiCheckout.',
      };
    }

    const title = `${link.title} | aiCheckout`;
    const description =
      link.description ||
      link.product?.description ||
      'Pagamento seguro com aprovação instantânea e entrega automática de infoproduto.';
    const imageUrl = link.product?.imageUrl || `${appUrl}/og-image.jpg`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${appUrl}/pay/${params.slug}`,
        siteName: 'aiCheckout',
        images: [
          {
            url: imageUrl,
            secureUrl: imageUrl,
            width: 1200,
            height: 630,
            alt: link.title,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
      other: {
        'og:image:secure_url': imageUrl,
      },
    };
  } catch {
    return {
      title: 'Checkout Seguro | aiCheckout',
      description: 'Finalize sua compra com segurança via PIX ou Cartão no aiCheckout.',
    };
  }
}

export default function PaySlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

