import { defineConfig } from 'vitepress';

// VitePress config for the M.A.D. BOLT-REMIX documentation site.
// Brand: GALVANI by M.A.D. LABS · Multiverse Aurora theme.

const GALVANI = 'linear-gradient(120deg, #2CE5B8 0%, #7C5CFF 100%)';
const AURORA = 'linear-gradient(120deg, #6B8CFF, #2DD4BF, #EC4899)';

const auroraButton =
  'background: linear-gradient(120deg, #2CE5B8, #7C5CFF); color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600;';

const auroraHomeHero = {
  name: 'M.A.D. BOLT-REMIX',
  text: 'By: Dr. Neal — Where ideas become multiverses',
  tagline:
    'AI-powered full-stack app builder that runs in your browser. 19+ LLM providers, WebContainer, Git, MCP — engineered in the M.A.D. Laboratory.',
  actions: [
    { theme: 'brand', text: 'Get Started', link: '/guide/getting-started' },
    { theme: 'alt', text: 'View on GitHub', link: 'https://github.com/Dr-Nealz/M.A.D.-BOLT' },
  ],
  features: [
    {
      icon: '🧪',
      title: '19+ LLM Providers',
      details:
        'OpenAI, Anthropic, Google, Mistral, NVIDIA, 9router and more — configure keys and models in the UI.',
    },
    {
      icon: '⚡',
      title: 'WebContainer',
      details:
        'Write code in-browser and run it instantly in a sandboxed Node.js runtime with a live preview and terminal.',
    },
    {
      icon: '🔮',
      title: 'M.A.D. Mods',
      details:
        'GALVANI by M.A.D. LABS brand, NVIDIA + 9router providers, Multiverse Aurora theme, and a MAD-scientist soul.',
    },
  ],
};

export default defineConfig({
  title: 'M.A.D. BOLT-REMIX',
  description:
    'M.A.D. BOLT-REMIX — AI-powered full-stack app builder by Dr. Neal (The M.A.D. Doctor)',
  lang: 'en-US',
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    [
      'meta',
      {
        name: 'og:title',
        content: 'M.A.D. BOLT-REMIX — By: Dr. Neal (The M.A.D. Doctor)',
      },
    ],
  ],
  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'M.A.D. BOLT-REMIX',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Providers', link: '/guide/providers' },
      { text: 'GitHub', link: 'https://github.com/Dr-Nealz/M.A.D.-BOLT' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Providers', link: '/guide/providers' },
          { text: 'WebContainer', link: '/guide/webcontainer' },
          { text: 'Git & GitHub', link: '/guide/git' },
          { text: 'MCP', link: '/guide/mcp' },
          { text: 'Deploy', link: '/guide/deploy' },
          { text: 'Desktop App', link: '/guide/desktop' },
          { text: 'Licensing', link: '/guide/licensing' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/Dr-Nealz/M.A.D.-BOLT' }],
    footer: {
      message: 'GALVANI by M.A.D. LABS · Engineered by Dr. Neal (The M.A.D. Doctor)',
      copyright: `© ${new Date().getFullYear()} M.A.D. LABS — All rights reserved.`,
    },
    outline: { label: 'On this page', level: [2, 3] },
    search: { provider: 'local' },
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `$galvani: linear-gradient(120deg, #2CE5B8 0%, #7C5CFF 100%); $aurora: linear-gradient(120deg, #6B8CFF, #2DD4BF, #EC4899);`,
        },
      },
    },
  },
  lastUpdated: true,
});
