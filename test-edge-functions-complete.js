/**
 * Teste completo das Edge Functions do Supabase
 */

const SUPABASE_URL = 'https://iskzruvdeqegerhphyec.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlza3pydXZkZXFlZ2VyaHBoeWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTAxMjUsImV4cCI6MjA5MDIyNjEyNX0.K2qNsZAV97qwYDq9HfufTrFZDcX-fSnPGjIf4oCkqw8';

const FUNCTIONS = {
  oauthStart: 'https://iskzruvdeqegerhphyec.functions.supabase.co/oauth-start',
  oauthCallback: 'https://iskzruvdeqegerhphyec.functions.supabase.co/oauth-callback',
  oauthRefresh: 'https://iskzruvdeqegerhphyec.functions.supabase.co/oauth-refresh',
  oauthProxy: 'https://iskzruvdeqegerhphyec.functions.supabase.co/oauth-proxy',
  googleApiProxy: 'https://iskzruvdeqegerhphyec.functions.supabase.co/google-api-proxy'
};

async function testFunction(name, url, method = 'POST', body = null) {
  try {
    console.log(`\n🔍 Testando: ${name}`);
    console.log(`URL: ${url}`);
    
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
    const status = response.status;
    const statusText = response.statusText;
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Failed to parse JSON response' };
    }

    const result = {
      ok: response.ok,
      status,
      statusText,
      data
    };

    console.log(`Status: ${status} (${statusText})`);
    console.log(`OK: ${response.ok}`);
    
    if (response.ok) {
      console.log('✅ Sucesso!');
      console.log('Resposta:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Erro:', data);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Erro ao testar ${name}:`, error.message);
    return { ok: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando testes das Edge Functions...\n');
  
  console.log('='.repeat(60));
  console.log('1. Testando oauth-start');
  console.log('='.repeat(60));
  
  await testFunction(
    'oauth-start',
    FUNCTIONS.oauthStart,
    'POST',
    {
      provider: 'google',
      scopes: ['email', 'profile'],
      redirect_uri: 'http://localhost:3000/oauth/callback'
    }
  );

  console.log('\n' + '='.repeat(60));
  console.log('2. Testando oauth-callback');
  console.log('='.repeat(60));
  
  await testFunction(
    'oauth-callback',
    FUNCTIONS.oauthCallback,
    'POST',
    {
      code: 'test_code_123',
      state: 'test_state_123',
      code_verifier: 'test_verifier'
    }
  );

  console.log('\n' + '='.repeat(60));
  console.log('3. Testando oauth-refresh');
  console.log('='.repeat(60));
  
  await testFunction(
    'oauth-refresh',
    FUNCTIONS.oauthRefresh,
    'POST',
    {
      provider: 'google',
      refresh_token: 'test_refresh_token'
    }
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ Testes completos!');
  console.log('='.repeat(60));
}

// Executar os testes
runAllTests().catch(console.error);