
import React from 'react';
import { GoogleGeminiIcon, ProductHuntIcon } from './icons';

const announcements = [
     {
      id: 'silo-1.5',
      icon: <span className="material-symbols-outlined text-4xl text-blue-500">rocket_launch</span>,
      title: 'Introducing Silo Build 1.5',
      description: 'Now with Figma & GitHub imports, a new dev portal, and more!',
      link: '#/developer-portal',
      linkLabel: 'Learn More',
    },
    {
      id: 'saashub-approved',
      icon: <span className="material-symbols-outlined text-4xl text-blue-500">military_tech</span>,
      title: 'Approved by SaaSHub',
      description: 'Discover Silo Build among the best AI Development Tools.',
      badgeHtml: `<a href='https://www.saashub.com/silo-build?utm_source=badge&utm_campaign=badge&utm_content=silo-build&badge_variant=color&badge_kind=approved' target='_blank'><img src="https://cdn-b.saashub.com/img/badges/approved-color.png?v=1" alt="Silo Build badge" style="max-width: 150px;"/></a>`,
    },
    {
      id: 'google-gemini',
      icon: <GoogleGeminiIcon />,
      title: 'Silo Build x Google Gemini',
      description: 'Integration of the Day: Power your apps with Gemini.',
      link: '#/integrations',
      linkLabel: 'Add Integration',
    },
    {
      id: 'product-hunt',
      icon: <ProductHuntIcon />,
      title: 'We are live on Product Hunt!',
      badgeHtml: `<a href="https://www.producthunt.com/products/silo-build?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-silo-build" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1027607&theme=light&t=1760711966482" alt="Silo Build - Create apps and websites by chatting with AI. | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>`,
    },
  ];

const articles = [
  {
    title: 'Beyond the Build: Our Vision for Future Innovations',
    date: 'October 18, 2025',
    excerpt: 'We\'re dreaming big. From multi-agent development teams and direct App Store submissions to AI-powered UI/UX analysis, we\'re exploring the next frontier of software creation. Discover our roadmap for making Silo Build the most intelligent and seamless development environment ever.',
    link: '#',
  },
  {
    title: 'Introducing Real-Time Code Generation',
    date: 'October 17, 2025',
    excerpt: 'Silo Build now writes code in real-time! Watch as the AI generates files, writes code character-by-character, and updates your project live, powered by Gemini\'s streaming API. The future of development is here, and it\'s instant.',
    link: '#/news/real-time-code-gen',
  },
  {
    title: 'Silo Build Partners with Neon for Serverless Postgres',
    date: 'October 16, 2025',
    excerpt: 'We are thrilled to announce a new partnership with Neon, bringing the power of serverless PostgreSQL to all Silo Build projects. Developers can now connect their Neon databases in a single click and instruct the AI to build data-driven applications.',
    link: '#/integrations',
  },
  {
    title: 'Introducing Max: Your Autonomous AI Development Partner',
    date: 'October 15, 2025',
    excerpt: 'Meet Max, the new AI agent inside Silo Build. Activate Max and watch as it brainstorms, writes, and executes prompts for you, iteratively building your application with minimal supervision.',
    link: '#',
  },
  {
    title: 'New in 1.5: Figma & GitHub Imports',
    date: 'October 14, 2025',
    excerpt: 'Our latest update supercharges your workflow. You can now import designs directly from Figma or use an existing GitHub repository as context for the AI, making it easier than ever to turn ideas into reality.',
    link: '#',
  }
];

export const DocsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-gray-50 text-black">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-2">Newsroom</h1>
          <p className="text-lg text-gray-600">The latest features, articles, and announcements from the Silo Build team.</p>
        </header>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-black mb-6">Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow flex flex-col justify-between">
                        <div>
                            <div className="flex items-start space-x-4 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg p-2 flex items-center justify-center">
                                    {announcement.icon}
                                </div>
                                <h3 className="font-semibold text-lg text-black">{announcement.title}</h3>
                            </div>
                            {announcement.description && (
                                <p className="text-sm text-gray-600">{announcement.description}</p>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end items-center">
                            {announcement.linkLabel && (
                                <a href={announcement.link} className="font-semibold text-sm text-blue-600 hover:underline">
                                    {announcement.linkLabel} &rarr;
                                </a>
                            )}
                            {announcement.badgeHtml && (
                                <div dangerouslySetInnerHTML={{ __html: announcement.badgeHtml }} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>

        <h2 className="text-3xl font-bold text-black mb-6">Recent Articles</h2>
        <div className="space-y-8">
          {articles.map((article, index) => (
            <div key={index} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-500 mb-2">{article.date}</p>
              <h2 className="text-2xl font-semibold text-black mb-3">{article.title}</h2>
              <p className="text-gray-700 leading-relaxed mb-4">{article.excerpt}</p>
              <a href={article.link} className="font-semibold text-blue-600 hover:underline">
                Read More &rarr;
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};