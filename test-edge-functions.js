/**
 * Teste das Edge Functions do Supabase
 * 
 * Este script testa todas as funções Edge Functions implantadas
 */

const SUPABASE_URL = 'https://iskzruvdeqegerhphyec.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlza3pydXZkcWVnZXJocGh5ZWMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3NDY1MDEyNSwiZXhwIjoxOTk0MjI2MTI1fQ.K2qNsZAV97qwYDq9HfufTrFZDcX-fSnPGjIf4oCkqw8';

const FUNCTIONS = {
  oauthStart: `${SUPABASE_URL}/functions/v1/oauth-start`,
  oauthCallback: `${SUPABASE_URL}/functions/v1/oauth-callback`,
  oauthRefresh: `${SUPABASE_URL}/functions/v1/oauth-refresh`,
  oauthProxy: `${SUPABASE_URL}/functions/v1/oauth-proxy`,
  googleApiProxy: `${SUPABASE_URL}/functions/v1/google-api-proxy`
};

async function testFunction(url, method = 'POST', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: data
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes das Edge Functions...\n');
  
  // Teste 1: oauth-start
  console.log('1. Testando oauth-start...');
  const startResult = await testFunction(FUNCTIONS.oauthStart, 'POST', {
    provider: 'google',
    scopes: ['email', 'profile'],
    redirect_uri: 'http://localhost:3000/oauth/callback'
  });
  
  console.log('✅ oauth-start:', startResult.ok ? 'OK' : 'ERRO');
  if (startResult.ok) {
    console.log('   URL de autorização:', startResult.data.url);
  }
  
  // Teste 2: oauth-callback (simulado)
  console.log('\n2. Testando oauth-callback...');
  const callbackResult = await testFunction(FUNCTIONS.oauthCallback, 'POST', {
    code: 'test_code',
    state: 'test_state',
    code_verifier: 'test_verifier'
  });
  
  console.log('✅ oauth-callback:', callbackResult.ok ? 'OK' : 'ERRO');
  
  // Teste 3: oauth-refresh
  console.log('\n3. Testando oauth-refresh...');
  const refreshResult = await testFunction(FUNCTIONS.oauthRefresh, 'POST', {
    provider: 'google',
    refresh_token: 'test_refresh_token'
  });
  
  console.log('✅ oauth-refresh:', refreshResult.ok ? 'OK' : 'ERRO');
  
  // Teste 4: oauth-proxy
  console.log('\n4. Testando oauth-proxy...');
  const proxyResult = await testFunction(FUNCTIONS.oauthProxy, 'POST', {
    method: 'GET',
    url: 'https://api.example.com/test',
    access_token: 'test_token'
  });
  
  console.log('✅ oauth-proxy:', proxyResult.ok ? 'OK' : 'ERRO');
  
  // Teste 5: google-api-proxy
  console.log('\n5. Testando google-api-proxy...');
  const googleResult = await testFunction(FUNCTIONS.googleApiProxy, 'POST', {
    endpoint: '/gmail/v1/users/me/messages',
    method: 'GET',
    access_token: 'test_token'
  });
  
  console.log('✅ google-api-proxy:', googleResult.ok ? 'OK' : 'ERRO');
  
  console.log('\n🎉 Testes concluídos!');
}

// Executar os testes
runTests().catch(console.error);