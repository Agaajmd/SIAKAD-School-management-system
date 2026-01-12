import { MetadataRoute } from 'next'

// Required for static export
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://school-management.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/register',
        ],
        disallow: [
          '/api/',
          '/_next/',
          '/admin/*',
          '/employee/*',
          '/student/*',
          '/super-admin/*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/login',
          '/register',
        ],
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/login',
          '/register',
        ],
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
