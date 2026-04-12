import { defineConfig } from 'vitepress'

const siteUrl = 'https://sanderdesnaijer.github.io/map-gesture-controls'
const authorSite = 'https://www.sanderdesnaijer.com'
const siteTitle = 'Map Gesture Controls'
const siteDescription =
  'Browser-native hand gesture controls for OpenLayers and Google Maps. Pan, zoom, and navigate maps using hand gestures powered by MediaPipe. No backend required.'

export default defineConfig({
  title: siteTitle,
  description: siteDescription,
  base: '/map-gesture-controls/',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  sitemap: {
    hostname: 'https://sanderdesnaijer.github.io',
    transformItems: (items) =>
      items.map((item) => ({
        ...item,
        url: `/map-gesture-controls/${item.url}`.replace(/\/$/, '') || '/map-gesture-controls',
      })),
  },
  head: [
    // Primary meta
    ['meta', { name: 'author', content: 'Sander de Snaijer' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'map gesture controls, hand gesture map, OpenLayers gestures, Google Maps gestures, MediaPipe map, webcam map control, gesture navigation, touchless map, hand tracking map, browser gesture control, accessibility map, google maps hand tracking',
      },
    ],
    ['meta', { name: 'robots', content: 'index, follow' }],

    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: siteTitle }],
    ['meta', { property: 'og:title', content: siteTitle }],
    ['meta', { property: 'og:description', content: siteDescription }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:image', content: `${siteUrl}/og-image.webp` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'Map Gesture Controls - Control maps with hand gestures' }],

    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: siteTitle }],
    ['meta', { name: 'twitter:description', content: siteDescription }],
    ['meta', { name: 'twitter:image', content: `${siteUrl}/og-image.webp` }],
    ['meta', { name: 'twitter:image:alt', content: 'Map Gesture Controls - Control maps with hand gestures' }],

    // Favicon
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/map-gesture-controls/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/map-gesture-controls/favicon-16x16.png' }],

    // Theme color
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],

    // Structured data (JSON-LD)
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: siteTitle,
        description: siteDescription,
        url: siteUrl,
        codeRepository:
          'https://github.com/sanderdesnaijer/map-gesture-controls',
        programmingLanguage: 'TypeScript',
        runtimePlatform: 'Browser',
        author: {
          '@type': 'Person',
          name: 'Sander de Snaijer',
          url: authorSite,
          sameAs: ['https://github.com/sanderdesnaijer'],
        },
        license: 'https://opensource.org/licenses/MIT',
      }),
    ],
  ],
  transformPageData(pageData) {
    const canonicalUrl = `${siteUrl}/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '')
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push([
      'link',
      { rel: 'canonical', href: canonicalUrl },
    ])
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api/ol' },
      { text: 'Author', link: authorSite },
      { text: 'GitHub', link: 'https://github.com/sanderdesnaijer/map-gesture-controls' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
        ]
      },
      {
        text: 'OpenLayers',
        items: [
          { text: 'Getting Started', link: '/ol/getting-started' },
          { text: 'Examples', link: '/ol/examples' },
        ]
      },
      {
        text: 'Google Maps',
        items: [
          { text: 'Getting Started', link: '/google-maps/getting-started' },
          { text: 'Examples', link: '/google-maps/examples' },
        ]
      },
      {
        text: 'Shared',
        items: [
          { text: 'Configuration', link: '/configuration' },
          { text: 'Gestures', link: '/gestures' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: '@map-gesture-controls/ol', link: '/api/ol' },
          { text: '@map-gesture-controls/google-maps', link: '/api/google-maps' },
          { text: '@map-gesture-controls/core', link: '/api/core' },
        ]
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Architecture', link: '/advanced/architecture' },
          { text: 'Custom Gestures', link: '/advanced/custom-gestures' },
        ]
      }
    ],
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sanderdesnaijer/map-gesture-controls' }
    ]
  }
})
