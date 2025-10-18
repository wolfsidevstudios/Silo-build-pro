import React from 'react';

const badges = [
  {
    platform: 'Product Hunt',
    title: 'Featured on Product Hunt!',
    description: 'We were featured as a top product, showcasing our innovative approach to AI-driven development.',
    badgeHtml: `<a href="https://www.producthunt.com/products/silo-build?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-silo-build" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1027607&theme=light&t=1760711966482" alt="Silo Build - Create apps and websites by chatting with AI. | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>`,
  },
  {
    platform: 'SaaSHub',
    title: 'Approved by SaaSHub',
    description: 'Recognized by SaaSHub as a leading solution in the AI Development Tools category.',
    badgeHtml: `<a href='https://www.saashub.com/silo-build?utm_source=badge&utm_campaign=badge&utm_content=silo-build&badge_variant=color&badge_kind=approved' target='_blank'><img src="https://cdn-b.saashub.com/img/badges/approved-color.png?v=1" alt="Silo Build badge" style="max-width: 150px;"/></a>`,
  }
];

export const AwardsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-gray-50 text-black">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-2">Awards & Badges</h1>
          <p className="text-lg text-gray-600">We're proud of the recognition we've received from the community.</p>
        </header>

        <div className="space-y-8">
          {badges.map((badge, index) => (
            <div key={index} className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-semibold text-black mb-2">{badge.title}</h2>
                <p className="text-gray-700 leading-relaxed max-w-md">{badge.description}</p>
              </div>
              <div className="flex-shrink-0" dangerouslySetInnerHTML={{ __html: badge.badgeHtml }} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
