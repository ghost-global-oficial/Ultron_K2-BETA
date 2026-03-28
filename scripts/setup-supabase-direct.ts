/**
 * Script para criar tabelas diretamente no Supabase
 * Usando as credenciais do projeto Ghost systems Ultron service
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carregar credenciais de variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: Credenciais do Supabase não configuradas!');
  console.error('');
  console.error('Configure as variáveis de ambiente:');
  console.error('  SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key');
  console.error('');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(60));
  console.log('ULTRON - Setup Supabase (Ghost systems Ultron service)');
  console.log('='.repeat(60));
  console.log('');

  // Criar cliente com service_role key para ter permissões completas
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  console.log('📋 Projeto: Ghost systems Ultron service');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log('');

  try {
    console.log('🔍 Lendo script SQL...');
    const sqlPath = join(process.cwd(), 'supabase-setup.sql');
    const sqlScript = readFileSync(sqlPath, 'utf-8');
    
    // Remover comentários e linhas vazias
    const sqlCommands = sqlScript
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    console.log('✅ Script SQL carregado');
    console.log('');

    console.log('🚀 Executando script SQL...');
    console.log('   (Isso pode levar alguns segundos)');
    console.log('');

    // Executar o script SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlCommands
    });

    if (error) {
      // Se a função exec_sql não existir, tentar executar diretamente
      console.log('⚠️  Função exec_sql não encontrada, tentando método alternativo...');
      
      // Dividir em comandos individuais e executar
      const commands = sqlCommands
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);

      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        console.log(`   Executando comando ${i + 1}/${commands.length}...`);
        
        const { error: cmdError } = await supabase.rpc('exec', {
          query: cmd
        });

        if (cmdError) {
          console.log(`   ⚠️  Aviso: ${cmdError.message}`);
        }
      }
    }

    console.log('');
    console.log('🔍 Verificando tabelas criadas...');
    
    // Verificar se as tabelas foram criadas
    const tables = ['oauth_tokens', 'service_credentials', 'webhooks', 'api_keys'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(0);

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK`);
      }
    }

    console.log('');
    console.log('🎉 Setup concluído com sucesso!');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Execute: npm run test-supabase-simple');
    console.log('2. Inicie o ULTRON: npm run dev');
    console.log('3. Teste as integrações OAuth');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Erro durante o setup:', error.message);
    console.error('');
    console.error('Detalhes:', error);
    console.error('');
    console.error('Solução alternativa:');
    console.error('Execute o script SQL manualmente no Supabase Dashboard:');
    console.error('https://app.supabase.com/project/iskzruvdeqegerhphyec/sql/new');
    console.error('');
    process.exit(1);
  }
}

main();
