import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'map-gesture-controls',
  description: 'Control maps with hand gestures using MediaPipe',
  base: '/map-gesture-controls/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api/ol' },
      { text: 'GitHub', link: 'https://github.com/sanderdesnaijer/map-gesture-controls' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Gestures', link: '/gestures' },
          { text: 'Examples', link: '/examples' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: '@map-gesture-controls/ol', link: '/api/ol' },
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
