/**
 * Exemplo de uso das Edge Functions para OAuth com Google
 */

// Configuração
const EDGE_FUNCTIONS_URL = 'https://seu-projeto.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'sua-chave-anon-aqui';

// Elementos da interface
const loginButton = document.getElementById('login-button');
const statusDiv = document.getElementById('status');
const userInfoDiv = document.getElementById('user-info');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se já existe um token de acesso
    const accessToken = localStorage.getItem('oauth_access_token');
    const refreshToken = localStorage.getItem('oauth_refresh_token');
    
    if (accessToken) {
        // Já autenticado, mostrar informações do usuário
        fetchUserInfo(accessToken);
    }
});

// Função para iniciar o fluxo OAuth
async function startOAuth() {
    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/oauth-start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                provider: 'google',
                service: 'gmail',
                scopes: [
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ],
                redirect_uri: window.location.origin + '/oauth/callback'
            })
        });

        if (!response.ok) {
            throw new Error('Falha ao iniciar OAuth');
        }

        const data = await response.json();
        
        // Redirecionar para a URL de autorização
        window.location.href = data.auth_url;
        
    } catch (error) {
        console.error('Erro ao iniciar OAuth:', error);
        showError('Erro ao iniciar autenticação');
    }
}

// Função para processar o callback OAuth
async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
        showError(`Erro de autorização: ${error}`);
        return;
    }
    
    if (code) {
        try {
            // Trocar código por token
            const response = await fetch(`${EDGE_FUNCTIONS_URL}/oauth-callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    code,
                    state,
                    provider: 'google'
                })
            });
            
            if (!response.ok) {
                throw new Error('Falha ao trocar código por token');
            }
            
            const tokenData = await response.json();
            
            // Salvar tokens
            localStorage.setItem('oauth_access_token', tokenData.access_token);
            localStorage.setItem('oauth_refresh_token', tokenData.refresh_token);
            localStorage.setItem('oauth_token_expires', 
                Date.now() + (tokenData.expires_in * 1000));
            
            // Redirecionar para a página principal
            window.location.href = '/';
            
        } catch (error) {
            console.error('Erro no callback OAuth:', error);
            showError('Erro ao processar autenticação');
        }
    }
}

// Função para buscar informações do usuário
async function fetchUserInfo(accessToken) {
    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/user-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                provider: 'google',
                access_token: accessToken
            })
        });
        
        if (!response.ok) {
            throw new Error('Falha ao buscar informações do usuário');
        }
        
        const userInfo = await response.json();
        displayUserInfo(userInfo);
        
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
    }
}

// Função para fazer requisições autenticadas
async function makeAuthenticatedRequest(endpoint, method = 'GET', data = null) {
    const accessToken = localStorage.getItem('oauth_access_token');
    
    if (!accessToken) {
        throw new Error('Usuário não autenticado');
    }
    
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
            method: 'GET',
            url: endpoint,
            access_token: accessToken
        })
    });
    
    if (!response.ok) {
        throw new Error('Falha na requisição autenticada');
    }
    
    return response.json();
}

// Exemplo: Buscar emails do Gmail
async function fetchGmailMessages() {
    try {
        const messages = await makeAuthenticatedRequest(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages'
        );
        displayMessages(messages);
    } catch (error) {
        console.error('Erro ao buscar emails:', error);
    }
}

// Exemplo: Buscar eventos do Google Calendar
async function fetchCalendarEvents() {
    try {
        const events = await makeAuthenticatedRequest(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        );
        displayEvents(events);
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
    }
}

// Funções auxiliares de UI
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function displayUserInfo(userInfo) {
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `
            <h3>Bem-vindo, ${userInfo.name}!</h3>
            <p>Email: ${userInfo.email}</p>
            <img src="${userInfo.picture}" alt="Foto do perfil" style="border-radius: 50%; width: 50px; height: 50px;">
        `;
    }
}

// Inicialização
if (window.location.pathname.includes('callback')) {
    handleOAuthCallback();
}

// Expor funções globalmente para uso no HTML
window.startOAuth = startOAuth;
window.fetchGmailMessages = fetchGmailMessages;
window.fetchCalendarEvents = fetchCalendarEvents;