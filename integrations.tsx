import React from 'react';
import { YouTubeIcon, OpenAIIcon, SpotifyIcon, StripeIcon, GitHubIcon, PayPalIcon, PinterestIcon, ProductHuntIcon, TwilioIcon, DiscordIcon, XIcon, SendGridIcon, OpenWeatherIcon, PexelsIcon, UnsplashIcon, NotionIcon, AirtableIcon, ShopifyIcon, GiphyIcon, GoogleAnalyticsIcon, GoogleGmailIcon, GoogleCalendarIcon, GooglePayIcon, GoogleAdsenseIcon, GoogleGeminiIcon, AppleSignInIcon, AppleMapKitIcon, AppleMusicIcon, AppleICloudIcon, JasperIcon, RunwayIcon, UberIcon, TikTokIcon, VenmoIcon, RedditIcon, SoundCloudIcon, KofiIcon, RssIcon, CloudflareIcon, GoogleMapsIcon } from './components/icons';

export interface Integration {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    storageKey?: string;
    keys?: { name: string; label: string }[];
    usageInstructions?: string;
    category?: string;
    prompt?: string;
    getApiKeyUrl?: string;
}

export const BROWSER_API_DEFINITIONS: Integration[] = [
    {
        id: 'geolocation',
        name: 'Geolocation API',
        icon: <span className="material-symbols-outlined text-4xl text-blue-500">location_on</span>,
        description: "Access the user's location for location-aware features.",
        prompt: "Build an app that asks for location permission and then displays the user's current latitude and longitude.",
        category: 'Browser APIs'
    },
    {
        id: 'camera',
        name: 'Camera (getUserMedia)',
        icon: <span className="material-symbols-outlined text-4xl text-red-500">photo_camera</span>,
        description: 'Capture video and images directly from the device camera.',
        prompt: 'Create a photobooth app. Show the live camera feed on the page and include a button to capture a photo and display it below the feed.',
        category: 'Browser APIs'
    },
    {
        id: 'speech-recognition',
        name: 'Speech Recognition',
        icon: <span className="material-symbols-outlined text-4xl text-purple-500">mic</span>,
        description: 'Transcribe spoken words into text using the Web Speech API.',
        prompt: 'Build a voice note app. It should have a "Start Listening" button that transcribes speech to text in a text area, and a "Stop Listening" button.',
        category: 'Browser APIs'
    },
    {
        id: 'speech-synthesis',
        name: 'Speech Synthesis',
        icon: <span className="material-symbols-outlined text-4xl text-green-500">volume_up</span>,
        description: 'Convert text into spoken voice with the Web Speech API.',
        prompt: 'Create a text-to-speech app with a textarea and a "Speak" button. When the button is clicked, the app should read the text from the textarea aloud.',
        category: 'Browser APIs'
    },
    {
        id: 'fullscreen',
        name: 'Fullscreen API',
        icon: <span className="material-symbols-outlined text-4xl text-gray-700">fullscreen</span>,
        description: 'Allow users to view a specific element in fullscreen mode.',
        prompt: "Build a simple image viewer with an 'Enter Fullscreen' button. When clicked, the image should take up the entire screen.",
        category: 'Browser APIs'
    },
    {
        id: 'clipboard',
        name: 'Clipboard API',
        icon: <span className="material-symbols-outlined text-4xl text-yellow-600">content_paste</span>,
        description: 'Securely copy text and other data to the user clipboard.',
        prompt: 'Create a component with a text input and a "Copy" button. When the button is clicked, the text from the input should be copied to the clipboard.',
        category: 'Browser APIs'
    },
    {
        id: 'web-share',
        name: 'Web Share API',
        icon: <span className="material-symbols-outlined text-4xl text-indigo-500">share</span>,
        description: 'Enable native sharing capabilities on supported devices.',
        prompt: 'Create a simple article page with a title, some text, and a "Share" button. Clicking the button should open the native device sharing UI.',
        category: 'Browser APIs'
    },
    {
        id: 'vibration',
        name: 'Vibration API',
        icon: <span className="material-symbols-outlined text-4xl text-teal-500">vibration</span>,
        description: 'Provide physical feedback through device vibration (mobile only).',
        prompt: 'Build a set of buttons that trigger different vibration patterns when clicked: a short buzz, a long buzz, and a "mario" sequence.',
        category: 'Browser APIs'
    }
];

export const INTEGRATION_DEFINITIONS: Integration[] = [
    {
        id: 'neon',
        name: 'Neon',
        icon: <span className="material-symbols-outlined text-4xl text-cyan-500">database</span>,
        description: 'Connect to a serverless, scalable PostgreSQL database from Neon.',
        storageKey: 'silo_integration_neon',
        keys: [{ name: 'connectionString', label: 'Neon Connection String' }],
        usageInstructions: 'The application is connected to a Neon serverless Postgres database. The connection string is `{{connectionString}}`. For frontend code, assume a backend API exists that uses this connection string to connect to the database. Make `fetch` requests to hypothetical API endpoints corresponding to the SQL schema (e.g., `/api/users`).',
        category: 'Databases & Backend-as-a-Service',
        getApiKeyUrl: 'https://neon.tech/docs/connect/connect-from-any-app#find-your-connection-string',
    },
    {
        id: 'postgresql',
        name: 'PostgreSQL',
        icon: <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-blue-600 bg-gray-100 rounded-lg">Pg</span>,
        description: 'Connect to any standard PostgreSQL database.',
        storageKey: 'silo_integration_postgresql',
        keys: [{ name: 'connectionString', label: 'PostgreSQL Connection String' }],
        usageInstructions: 'The application is connected to a PostgreSQL database. The connection string is `{{connectionString}}`. For frontend code, assume a backend API exists that uses this connection string to connect to the database. Make `fetch` requests to hypothetical API endpoints corresponding to the SQL schema (e.g., `/api/users`).',
        category: 'Databases & Backend-as-a-Service',
        getApiKeyUrl: 'https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING',
    },
    {
        id: 'apple-signin',
        name: 'Sign in with Apple',
        icon: <AppleSignInIcon />,
        description: 'Enable users to sign in to your app with their Apple ID.',
        storageKey: 'silo_integration_apple_signin',
        keys: [{ name: 'serviceId', label: 'Service ID' }],
        usageInstructions: 'Use the Sign in with Apple JS library. The `clientId` in your configuration should be `{{serviceId}}`.',
        category: 'Apple Services',
        getApiKeyUrl: 'https://developer.apple.com/help/account/configure-app-capabilities/configure-sign-in-with-apple-for-the-web',
    },
    {
        id: 'apple-mapkit',
        name: 'MapKit JS',
        icon: <AppleMapKitIcon />,
        description: 'Embed interactive maps with annotations and overlays.',
        storageKey: 'silo_integration_apple_mapkit',
        keys: [{ name: 'authToken', label: 'JWT Auth Token' }],
        usageInstructions: 'Use MapKit JS. When initializing the map, provide the authorization callback that returns your token `{{authToken}}`.',
        category: 'Apple Services',
        getApiKeyUrl: 'https://developer.apple.com/documentation/mapkitjs/creating_and_using_a_mapkit_js_key',
    },
    {
        id: 'apple-music',
        name: 'Apple Music',
        icon: <AppleMusicIcon />,
        description: 'Access Apple Music content and control playback.',
        storageKey: 'silo_integration_apple_music',
        keys: [{ name: 'developerToken', label: 'Developer Token (JWT)' }],
        usageInstructions: 'Use MusicKit JS. Configure it with your developer token `{{developerToken}}`.',
        category: 'Apple Services',
    },
];

// FIX: Export a combined list of all integrations as `ALL_INTEGRATIONS`.
export const ALL_INTEGRATIONS: Integration[] = [
    ...INTEGRATION_DEFINITIONS,
    ...BROWSER_API_DEFINITIONS,
];