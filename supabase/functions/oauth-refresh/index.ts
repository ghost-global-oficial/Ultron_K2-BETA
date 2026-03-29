// @ts-ignore - Deno is available in Supabase Edge Functions runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefreshTokenRequest {
  provider: string;
  refresh_token: string;
  client_id?: string;
  client_secret?: string;
}

const PROVIDER_CONFIGS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: Deno.env.get('GOOGLE_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: Deno.env.get('GITHUB_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET') || '',
  },
  microsoft: {
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
    clientSecret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
  },
  slack: {
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    clientId: Deno.env.get('SLACK_CLIENT_ID') || '',
    clientSecret: Deno.env.get('SLACK_CLIENT_SECRET') || '',
  }
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { provider, refresh_token, client_id, client_secret } = await req.json() as RefreshTokenRequest;
    
    if (!provider || !refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Provider and refresh token are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Unsupported provider' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const tokenUrl = config.tokenUrl;
    const clientId = client_id || config.clientId;
    const clientSecret = client_secret || config.clientSecret;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Client ID and secret are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const tokenData = await response.json();

    return new Response(
      JSON.stringify(tokenData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to refresh token', 
        details: error.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});