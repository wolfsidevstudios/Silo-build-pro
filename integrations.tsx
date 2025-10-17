import React from 'react';
import { YouTubeIcon, OpenAIIcon, SpotifyIcon, StripeIcon, GitHubIcon, PayPalIcon, PinterestIcon, ProductHuntIcon } from './components/icons';

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
    }
];
