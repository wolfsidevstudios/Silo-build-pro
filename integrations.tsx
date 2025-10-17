import React from 'react';
import { YouTubeIcon, OpenAIIcon, SpotifyIcon, StripeIcon, GitHubIcon, PayPalIcon, PinterestIcon, ProductHuntIcon, TwilioIcon, DiscordIcon, XIcon, SendGridIcon, OpenWeatherIcon, PexelsIcon, UnsplashIcon, NotionIcon, AirtableIcon, ShopifyIcon, GiphyIcon } from './components/icons';

export interface Integration {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    storageKey: string;
    keys: { name: string; label: string }[];
    usageInstructions?: string;
}

export const INTEGRATION_DEFINITIONS: Integration[] = [
    {
        id: 'youtube',
        name: 'YouTube',
        icon: <YouTubeIcon />,
        description: 'Build apps that can search videos, manage playlists, and more.',
        storageKey: 'silo_integration_youtube',
        keys: [{ name: 'apiKey', label: 'YouTube Data API Key v3' }],
        usageInstructions: 'Use the YouTube Data API v3. The endpoint is `https://www.googleapis.com/youtube/v3/`. Append `&key={{apiKey}}` to your requests for authentication.'
    },
    {
        id: 'openai',
        name: 'OpenAI',
        icon: <OpenAIIcon />,
        description: 'Integrate ChatGPT and other OpenAI models into your applications.',
        storageKey: 'silo_integration_openai',
        keys: [{ name: 'apiKey', label: 'OpenAI API Key' }],
        usageInstructions: 'Use the OpenAI API. The endpoint is `https://api.openai.com/v1/`. Use the token in the `Authorization: Bearer {{apiKey}}` header.'
    },
    {
        id: 'spotify',
        name: 'Spotify',
        icon: <SpotifyIcon />,
        description: 'Access music data, create playlists, and control playback.',
        storageKey: 'silo_integration_spotify',
        keys: [{ name: 'clientId', label: 'Spotify Client ID' }, { name: 'clientSecret', label: 'Spotify Client Secret' }],
        usageInstructions: 'Use the Spotify Web API. You will need to perform an OAuth flow or use the Client Credentials flow with your Client ID `{{clientId}}` and Client Secret `{{clientSecret}}` to get an access token.'
    },
    {
        id: 'stripe',
        name: 'Stripe',
        icon: <StripeIcon />,
        description: 'Build payment and e-commerce functionalities into your apps.',
        storageKey: 'silo_integration_stripe',
        keys: [{ name: 'publicKey', label: 'Stripe Public Key' }, { name: 'secretKey', label: 'Stripe Secret Key' }],
        usageInstructions: 'For frontend code, use the Public Key `{{publicKey}}` to initialize Stripe.js. The Secret Key `{{secretKey}}` is for backend operations and should not be exposed in frontend code; assume a backend exists that uses it.'
    },
    {
        id: 'github',
        name: 'GitHub',
        icon: <GitHubIcon />,
        description: 'Interact with repositories, users, and issues on GitHub.',
        storageKey: 'silo_integration_github',
        keys: [{ name: 'pat', label: 'GitHub Personal Access Token' }],
        usageInstructions: 'Use the GitHub REST API. The endpoint is `https://api.github.com/`. Authenticate using the `Authorization: Bearer {{pat}}` header.'
    },
    {
        id: 'paypal',
        name: 'PayPal',
        icon: <PayPalIcon />,
        description: 'Integrate PayPal for payments and checkouts.',
        storageKey: 'silo_integration_paypal',
        keys: [{ name: 'clientId', label: 'PayPal Client ID' }],
        usageInstructions: 'Use the PayPal JavaScript SDK. Initialize it by adding the script: `<script src="https://www.paypal.com/sdk/js?client-id={{clientId}}"></script>`. Then render the PayPal buttons.'
    },
    {
        id: 'pinterest',
        name: 'Pinterest',
        icon: <PinterestIcon />,
        description: 'Access and manage pins, boards, and user data.',
        storageKey: 'silo_integration_pinterest',
        keys: [{ name: 'accessToken', label: 'Pinterest Access Token' }],
        usageInstructions: 'Use the Pinterest API v5. The endpoint is `https://api.pinterest.com/v5/`. Authenticate using the `Authorization: Bearer {{accessToken}}` header.'
    },
    {
        id: 'producthunt',
        name: 'Product Hunt',
        icon: <ProductHuntIcon />,
        description: 'Fetch data about the latest tech products and startups.',
        storageKey: 'silo_integration_producthunt',
        keys: [{ name: 'developerToken', label: 'Product Hunt Developer Token' }],
        usageInstructions: "Use the Product Hunt API v2 (GraphQL). The endpoint is `https://api.producthunt.com/v2/api/graphql`. When making requests, include the token in the 'Authorization' header like this: `Authorization: Bearer {{developerToken}}`."
    },
    {
        id: 'twilio',
        name: 'Twilio',
        icon: <TwilioIcon />,
        description: 'Build apps with SMS, voice, and video capabilities.',
        storageKey: 'silo_integration_twilio',
        keys: [{ name: 'accountSid', label: 'Twilio Account SID' }, { name: 'authToken', label: 'Twilio Auth Token' }],
        usageInstructions: 'Use the Twilio REST API. The Account SID is `{{accountSid}}`. The Auth Token `{{authToken}}` is secret and should be used on a backend; assume a backend exists that uses it for authenticated requests.'
    },
    {
        id: 'discord',
        name: 'Discord',
        icon: <DiscordIcon />,
        description: 'Create Discord bots to interact with servers and users.',
        storageKey: 'silo_integration_discord',
        keys: [{ name: 'botToken', label: 'Discord Bot Token' }],
        usageInstructions: 'Use the Discord API. Authenticate requests with the bot token in the header: `Authorization: Bot {{botToken}}`.'
    },
    {
        id: 'x_twitter',
        name: 'X (Twitter)',
        icon: <XIcon />,
        description: 'Integrate with the X API to post tweets, fetch timelines, and more.',
        storageKey: 'silo_integration_x_twitter',
        keys: [
            { name: 'apiKey', label: 'API Key' },
            { name: 'apiSecretKey', label: 'API Secret Key' },
            { name: 'bearerToken', label: 'Bearer Token' }
        ],
        usageInstructions: 'Use the X API v2. For app-only authentication, use the Bearer Token `{{bearerToken}}` in the header: `Authorization: Bearer {{bearerToken}}`. The API Key and Secret are for user-based OAuth flows.'
    },
    {
        id: 'sendgrid',
        name: 'SendGrid',
        icon: <SendGridIcon />,
        description: 'Add reliable email delivery for notifications and marketing.',
        storageKey: 'silo_integration_sendgrid',
        keys: [{ name: 'apiKey', label: 'SendGrid API Key' }],
        usageInstructions: 'Use the SendGrid Mail Send API. The endpoint is `https://api.sendgrid.com/v3/mail/send`. Authenticate using the `Authorization: Bearer {{apiKey}}` header.'
    },
    {
        id: 'openweather',
        name: 'OpenWeather',
        icon: <OpenWeatherIcon />,
        description: 'Integrate real-time and forecasted weather data into your apps.',
        storageKey: 'silo_integration_openweather',
        keys: [{ name: 'apiKey', label: 'OpenWeather API Key' }],
        usageInstructions: 'Use the OpenWeather One Call API 3.0. The endpoint is `https://api.openweathermap.org/data/3.0/onecall`. Append `&appid={{apiKey}}` to your requests.'
    },
    {
        id: 'pexels',
        name: 'Pexels',
        icon: <PexelsIcon />,
        description: 'Access a vast library of free, high-quality stock photos and videos.',
        storageKey: 'silo_integration_pexels',
        keys: [{ name: 'apiKey', label: 'Pexels API Key' }],
        usageInstructions: 'Use the Pexels API. The endpoint is `https://api.pexels.com/v1/`. Authenticate using the `Authorization: {{apiKey}}` header.'
    },
    {
        id: 'unsplash',
        name: 'Unsplash',
        icon: <UnsplashIcon />,
        description: "Integrate beautiful, free images from the world's leading photo community.",
        storageKey: 'silo_integration_unsplash',
        keys: [{ name: 'accessKey', label: 'Unsplash Access Key' }],
        usageInstructions: 'Use the Unsplash API. The endpoint is `https://api.unsplash.com/`. Authenticate using the `Authorization: Client-ID {{accessKey}}` header.'
    },
    {
        id: 'notion',
        name: 'Notion',
        icon: <NotionIcon />,
        description: 'Read from and write to Notion pages and databases.',
        storageKey: 'silo_integration_notion',
        keys: [{ name: 'apiToken', label: 'Notion Integration Token' }],
        usageInstructions: 'Use the Notion API v1. The endpoint is `https://api.notion.com/v1/`. Authenticate using the `Authorization: Bearer {{apiToken}}` header. You must also include the `Notion-Version: 2022-06-28` header.'
    },
    {
        id: 'airtable',
        name: 'Airtable',
        icon: <AirtableIcon />,
        description: 'Use flexible, powerful Airtable bases as a backend for your apps.',
        storageKey: 'silo_integration_airtable',
        keys: [{ name: 'personalAccessToken', label: 'Personal Access Token' }, { name: 'baseId', label: 'Base ID' }],
        usageInstructions: 'Use the Airtable API. The endpoint is `https://api.airtable.com/v0/{{baseId}}/`. Authenticate using the `Authorization: Bearer {{personalAccessToken}}` header.'
    },
    {
        id: 'shopify',
        name: 'Shopify',
        icon: <ShopifyIcon />,
        description: 'Build custom storefronts and manage store data.',
        storageKey: 'silo_integration_shopify',
        keys: [{ name: 'storefrontAccessToken', label: 'Storefront Access Token' }, { name: 'storeDomain', label: 'Store Domain (e.g., your-store.myshopify.com)' }],
        usageInstructions: 'Use the Shopify Storefront GraphQL API. The endpoint is `https://{{storeDomain}}/api/2023-10/graphql.json`. Authenticate using the `X-Shopify-Storefront-Access-Token: {{storefrontAccessToken}}` header.'
    },
    {
        id: 'giphy',
        name: 'GIPHY',
        icon: <GiphyIcon />,
        description: "Access the world's largest library of animated GIFs and stickers.",
        storageKey: 'silo_integration_giphy',
        keys: [{ name: 'apiKey', label: 'GIPHY API Key' }],
        usageInstructions: "Use the GIPHY API. The endpoint is `https://api.giphy.com/v1/`. Append `&api_key={{apiKey}}` to your requests for authentication."
    },
];