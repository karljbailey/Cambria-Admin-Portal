export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Cambria Portal",
    "description": "Professional client management and performance monitoring dashboard for streamlined business operations.",
    "url": "https://cambria-admin-portal.onrender.com",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Organization",
      "name": "Cambria Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Cambria"
    },
    "featureList": [
      "Client Management",
      "Performance Monitoring",
      "ACOS Tracking",
      "TACOS Tracking",
      "Dashboard Analytics",
      "User Permissions"
    ],
    "screenshot": "https://cambria-admin-portal.onrender.com/og-image.svg",
    "softwareVersion": "1.0.0"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
