import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  userInfoUrl?: string;
}

const PROVIDER_CONFIGS: Record<string, OAuthConfig> = {
  google: {
    clientId: Deno.env.get('GOOGLE_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  github: {
    clientId: Deno.env.get('GITHUB_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET') || '',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user'
  },
  microsoft: {
    clientId: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
    clientSecret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
  },
  slack: {
    clientId: Deno.env.get('SLACK_CLIENT_ID') || '',
    clientSecret: Deno.env.get('SLACK_CLIENT_SECRET') || '',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com/api/users.identity'
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
    // Parse request body
    const body = await req.json();
    const { code, state, provider = 'google', redirect_uri, code_verifier } = body;
    const redirectUri = redirect_uri || 'http://localhost:5173/oauth-callback.html';

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Unsupported provider' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        ...(code_verifier && { code_verifier }),
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    
    // Get user info
    let userInfo = null;
    if (config.userInfoUrl) {
      const userInfoResponse = await fetch(config.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });
      
      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json();
      }
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        user_info: userInfo
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'OAuth callback failed', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});