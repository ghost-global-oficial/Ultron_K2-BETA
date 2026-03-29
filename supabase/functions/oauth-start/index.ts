import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthStartRequest {
  provider: string;
  service: string;
  scopes: string[];
  redirect_uri: string;
  state?: string;
}

const PROVIDER_CONFIGS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: Deno.env.get('GOOGLE_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
    includeClientIdInAuthUrl: true
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    clientId: Deno.env.get('GITHUB_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET') || '',
    includeClientIdInAuthUrl: true
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
    clientSecret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
    includeClientIdInAuthUrl: true
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    clientId: Deno.env.get('SLACK_CLIENT_ID') || '',
    clientSecret: Deno.env.get('SLACK_CLIENT_SECRET') || '',
    includeClientIdInAuthUrl: true
  }
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, service, scopes, redirect_uri, state } = await req.json() as OAuthStartRequest;
    
    if (!provider || !scopes || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const providerConfig = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
    if (!providerConfig) {
      return new Response(
        JSON.stringify({ error: 'Provider not supported' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Generate state and nonce for security
    const stateParam = state || generateRandomString(16);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Build authorization URL
    const authUrl = new URL(providerConfig.authUrl);
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirect_uri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: stateParam,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    if (providerConfig.includeClientIdInAuthUrl) {
      params.set('client_id', providerConfig.clientId);
    }

    authUrl.search = params.toString();
    
    // In a real implementation, you would store the codeVerifier
    // in a database or cache for later verification
    
    return new Response(
      JSON.stringify({
        url: authUrl.toString(),
        state: stateParam,
        code_verifier: codeVerifier
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    
  } catch (error) {
    console.error('Error in oauth-start:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

// Helper functions
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(String.fromCharCode.apply(null, new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}