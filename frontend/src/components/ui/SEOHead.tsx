import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  schema?: Record<string, unknown>;
}

const SITE_NAME = 'Sourav Homoeopathic Clinic';
const BASE_URL = 'https://www.souravhomoeopathic.com';
const DEFAULT_DESC = 'Expert Homoeopathic treatment for Cancer, Diabetes, Kidney Failure, Brain Tumor & complex diseases by Dr. Sourav Kumar Mondal. Online consultations available. Medicine dispatched across India.';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

const doctorSchema = {
  '@context': 'https://schema.org',
  '@type': 'Physician',
  name: 'Dr. Sourav Kumar Mondal',
  description: DEFAULT_DESC,
  medicalSpecialty: 'Homeopathic Physician',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Kolkata',
    addressRegion: 'West Bengal',
    addressCountry: 'IN',
  },
  telephone: '+91-7810880949',
  url: BASE_URL,
};

export default function SEOHead({ title, description, image, url, type = 'website', schema }: Props) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `Dr. Sourav Kumar Mondal - Homoeopathic Physician | ${SITE_NAME}`;
  const desc = description || DEFAULT_DESC;
  const img = image || DEFAULT_IMAGE;
  const pageUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {/* Schema.org */}
      <script type="application/ld+json">
        {JSON.stringify(schema || doctorSchema)}
      </script>
    </Helmet>
  );
}
