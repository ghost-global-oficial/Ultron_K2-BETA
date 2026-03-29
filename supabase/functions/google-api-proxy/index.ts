import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleApiRequest {
  endpoint: string;
  method: string;
  accessToken: string;
  body?: any;
  params?: Record<string, string>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { endpoint, method, body, params, accessToken } = await req.json() as GoogleApiRequest;

    if (!endpoint || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint or access token' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Build URL with query parameters
    let url = `https://www.googleapis.com${endpoint}`;
    if (params) {
      const urlParams = new URLSearchParams(params);
      url += `?${urlParams.toString()}`;
    }

    // Make request to Google API
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.text();
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('Google API proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to proxy request',
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