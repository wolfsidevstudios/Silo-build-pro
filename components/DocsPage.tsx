import React from 'react';

const articles = [
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
