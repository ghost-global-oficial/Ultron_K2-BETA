import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  accessToken: string;
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
    const { method, url, headers, body, accessToken, targetUrl } = await req.json() as {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: any;
      accessToken: string;
      targetUrl: string;
    };

    if (!accessToken || !targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing access token or target URL' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Validate the target URL to prevent SSRF
    try {
      const urlObj = new URL(targetUrl);
      const allowedDomains = [
        'api.github.com',
        'api.notion.com',
        'slack.com',
        'api.slack.com',
        'www.googleapis.com',
        'graph.microsoft.com',
        'api.notion.com'
      ];
      
      const domain = urlObj.hostname;
      const isAllowed = allowedDomains.some(allowed => 
        domain === allowed || domain.endsWith(`.${allowed}`)
      );
      
      if (!isAllowed) {
        return new Response(
          JSON.stringify({ error: 'Target domain not allowed' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...headers,
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
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Proxy request failed', details: error.message }),
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