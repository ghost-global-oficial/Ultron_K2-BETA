/**
 * Script para Verificar as Chaves do Supabase
 */

console.log('='.repeat(60));
console.log('ULTRON - Verificação de Chaves Supabase');
console.log('='.repeat(60));
console.log('');

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

console.log('📋 Informações fornecidas:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Anon Key: ${ANON_KEY}`);
console.log(`   Secret Key: ${SECRET_KEY}`);
console.log('');

console.log('⚠️  ATENÇÃO:');
console.log('');
console.log('As chaves fornecidas parecem estar em um formato não padrão.');
console.log('Chaves Supabase normalmente começam com "eyJ" (JWT format).');
console.log('');
console.log('Por favor, verifique as chaves corretas no Supabase Dashboard:');
console.log('');
console.log('1. Acesse: https://app.supabase.com/project/iskzruvdeqegerhphyec/settings/api');
console.log('2. Procure por:');
console.log('   - "Project URL" (deve ser: https://iskzruvdeqegerhphyec.supabase.co)');
console.log('   - "anon public" key (começa com eyJ...)');
console.log('   - "service_role" key (começa com eyJ...)');
console.log('');
console.log('3. Copie as chaves corretas e me forneça novamente.');
console.log('');
console.log('Exemplo de chave válida:');
console.log('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...');
console.log('');
