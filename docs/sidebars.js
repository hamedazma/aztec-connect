/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  // tutorialSidebar: [{type: 'autogenerated', dirName: '.'}],
  // introSidebar: [{type: 'autogenerated', dirName: 'how-aztec-works'}],
  // guidesSidebar: [{type: 'autogenerated', dirName: 'guides'}],
  docs: [
    'intro',
    {
      type: 'category',
      label: 'How Aztec Works',
      link: {
        type: 'generated-index',
      },
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Privacy',
          link: {
            type: 'doc',
            id: 'how-aztec-works/privacy',
          },
          items: ['how-aztec-works/privacy-sets'],
        },
        'how-aztec-works/scalability',
        {
          type: 'category',
          label: 'Aztec Connect',
          link: {
            type: 'doc',
            id: 'how-aztec-works/aztec-connect/aztec-connect',
          },
          items: ['how-aztec-works/aztec-connect/technical-intro'],
        },
        'how-aztec-works/accounts',
        'how-aztec-works/tokens',
        'how-aztec-works/talks-videos',
        'how-aztec-works/zkmoney-userguide',
        'how-aztec-works/faq',

      ],
    },
    // {
    //   type: 'category',
    //   label: 'Guides',
    //   link:{
    //     type: 'generated-index',
    //   },
    //   items: [
    //     'guides/overview',
    //     'guides/wallet-support',
    //     'guides/create-bridge',
    //     'guides/element-review',
    //     'guides/lido-review',
    //     'guides/goerli-testing',
    //   ],
    // },
    {
      type: 'category',
      label: 'SDK',
      link: {
        type: 'generated-index',
      },
      items: [
        'sdk/overview',
        {
          type: 'category',
          label: 'Usage',
          link: {
            type: 'generated-index',
          },
          items: [
            'sdk/usage/setup',
            'sdk/usage/add-account',
            'sdk/usage/register',
            'sdk/usage/deposit',
            'sdk/usage/transfer',
            'sdk/usage/withdraw',
          ],
        },
        {
          type: 'category',
          label: 'Types, Classes, Interfaces',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              type: 'autogenerated',
              dirName: 'sdk/types',
            },
          ],
        },
      ],
    },
    'glossary'
  ],
};

module.exports = sidebars;
