/**
 * Script para verificar dados no Supabase
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

async function check() {
  console.log('='.repeat(60));
  console.log('ULTRON - Verificação de Dados no Supabase');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Credenciais não configuradas no .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('📊 Verificando dados nas tabelas...');
  console.log('');

  // Verificar oauth_tokens
  console.log('🔍 oauth_tokens:');
  const { data: oauthData, error: oauthError } = await supabase
    .from('oauth_tokens')
    .select('id, user_id, service, provider, created_at');

  if (oauthError) {
    console.log(`   ❌ Erro: ${oauthError.message}`);
  } else {
    console.log(`   ✅ ${oauthData?.length || 0} registros encontrados`);
    if (oauthData && oauthData.length > 0) {
      oauthData.forEach(row => {
        console.log(`      - ${row.service} (${row.provider}) - User: ${row.user_id}`);
      });
    }
  }
  console.log('');

  // Verificar service_credentials
  console.log('🔍 service_credentials:');
  const { data: credsData, error: credsError } = await supabase
    .from('service_credentials')
    .select('id, user_id, service, email, created_at');

  if (credsError) {
    console.log(`   ❌ Erro: ${credsError.message}`);
  } else {
    console.log(`   ✅ ${credsData?.length || 0} registros encontrados`);
    if (credsData && credsData.length > 0) {
      credsData.forEach(row => {
        console.log(`      - ${row.service} - Email: ${row.email} - User: ${row.user_id}`);
      });
    }
  }
  console.log('');

  // Verificar webhooks
  console.log('🔍 webhooks:');
  const { data: webhooksData, error: webhooksError } = await supabase
    .from('webhooks')
    .select('id, user_id, name, service, enabled, created_at');

  if (webhooksError) {
    console.log(`   ❌ Erro: ${webhooksError.message}`);
  } else {
    console.log(`   ✅ ${webhooksData?.length || 0} registros encontrados`);
    if (webhooksData && webhooksData.length > 0) {
      webhooksData.forEach(row => {
        console.log(`      - ${row.name} (${row.service}) - Enabled: ${row.enabled} - User: ${row.user_id}`);
      });
    }
  }
  console.log('');

  // Verificar api_keys
  console.log('🔍 api_keys:');
  const { data: keysData, error: keysError } = await supabase
    .from('api_keys')
    .select('id, user_id, service, created_at');

  if (keysError) {
    console.log(`   ❌ Erro: ${keysError.message}`);
  } else {
    console.log(`   ✅ ${keysData?.length || 0} registros encontrados`);
    if (keysData && keysData.length > 0) {
      keysData.forEach(row => {
        console.log(`      - ${row.service} - User: ${row.user_id}`);
      });
    }
  }
  console.log('');

  console.log('📋 Resumo:');
  console.log(`   OAuth Tokens: ${oauthData?.length || 0}`);
  console.log(`   Credenciais: ${credsData?.length || 0}`);
  console.log(`   Webhooks: ${webhooksData?.length || 0}`);
  console.log(`   API Keys: ${keysData?.length || 0}`);
  console.log('');

  if ((oauthData?.length || 0) === 0 && 
      (credsData?.length || 0) === 0 && 
      (webhooksData?.length || 0) === 0 && 
      (keysData?.length || 0) === 0) {
    console.log('ℹ️  Nenhum dado encontrado no servidor.');
    console.log('   Isso é normal se você ainda não usou as integrações.');
    console.log('');
    console.log('   Os dados serão salvos automaticamente quando você:');
    console.log('   - Conectar uma integração OAuth (GitHub, Google, etc.)');
    console.log('   - Salvar credenciais de serviços (Computer Use)');
    console.log('   - Configurar webhooks');
    console.log('   - Adicionar API keys');
  } else {
    console.log('✅ Dados encontrados no servidor!');
    console.log('   As informações estão sendo armazenadas corretamente.');
  }
  console.log('');
}

check();
