/**
 * Exemplo de uso das Edge Functions do Supabase
 */

// Configuração
const EDGE_FUNCTIONS_BASE_URL = process.env.EDGE_FUNCTIONS_BASE_URL || 'https://seu-projeto.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sua-chave-aqui';

// Função para iniciar fluxo OAuth
async function startOAuthFlow(provider, scopes, redirectUri) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/oauth-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        provider,
        service: provider,
        scopes,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao iniciar OAuth:', error);
    throw error;
  }
}

// Função para processar callback
async function handleOAuthCallback(code, state, provider) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/oauth-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        code,
        state,
        provider
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro no callback OAuth:', error);
    throw error;
  }
}

// Função para fazer requisições autenticadas
async function makeAuthenticatedRequest(accessToken, method, url, data = null) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        method: 'POST',
        url,
        accessToken: accessToken,
        body: data
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na requisição autenticada:', error);
    throw error;
  }
}

// Função para refresh token
async function refreshToken(refreshToken, provider) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/oauth-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        provider
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao atualizar token:', error);
    throw error;
  }
}

// Exemplo de uso
async function exemploUso() {
  console.log('=== Exemplo de Uso das Edge Functions ===\n');

  // 1. Iniciar fluxo OAuth
  console.log('1. Iniciando fluxo OAuth...');
  try {
    const oauthData = await startOAuthFlow(
      'google',
      ['https://www.googleapis.com/auth/gmail.readonly'],
      'http://localhost:3000/oauth/callback'
    );
    
    console.log('URL de autorização:', oauthData.url);
    console.log('State:', oauthData.state);
    console.log('Session ID:', oauthData.session_id);
    
    // Em um caso real, você redirecionaria o usuário para oauthData.url
    // e depois processaria o callback com o código de autorização
  } catch (error) {
    console.error('Erro ao iniciar OAuth:', error);
  }

  // 2. Processar callback (exemplo)
  console.log('\n2. Processando callback OAuth...');
  // Em um caso real, você obteria o código e state da URL de callback
  const code = 'authorization_code_from_callback';
  const state = 'state_from_callback';
  
  try {
    const tokenData = await handleOAuthCallback(code, state, 'google');
    console.log('Token obtido:', tokenData.access_token);
    
    // 3. Fazer requisição autenticada
    console.log('\n3. Fazendo requisição autenticada...');
    const gmailMessages = await makeAuthenticatedRequest(
      tokenData.access_token,
      'GET',
      'https://gmail.googleapis.com/gmail/v1/users/me/messages'
    );
    
    console.log('Mensagens do Gmail:', gmailMessages);
    
  } catch (error) {
    console.error('Erro no fluxo OAuth:', error);
  }

  // 4. Refresh token (quando o token expirar)
  console.log('\n4. Atualizando token...');
  try {
    const refreshResponse = await refreshToken('refresh_token_here', 'google');
    console.log('Token atualizado:', refreshResponse);
  } catch (error) {
    console.error('Erro ao atualizar token:', error);
  }
}

// Executar exemplo (comente/descomente para testar)
// exemploUso().catch(console.error);

// Exportar funções para uso em outros módulos
module.exports = {
  startOAuthFlow,
  handleOAuthCallback,
  makeAuthenticatedRequest,
  refreshToken
};