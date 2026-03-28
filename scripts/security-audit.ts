/**
 * Security Audit Script
 * Verifies the security posture of the ULTRON installation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { validateSecureEnvironment } from '../src/security/secure-env';
import { listStoredServices } from '../src/security/encryption';

console.log('🔍 ULTRON Security Audit\n');
console.log('='.repeat(60));
console.log('');

let issuesFound = 0;
let warningsFound = 0;

// 1. Check environment variables
console.log('1️⃣  Checking Environment Variables...');
const envValidation = validateSecureEnvironment();
if (!envValidation.valid) {
  warningsFound += envValidation.warnings.length;
  envValidation.warnings.forEach(warning => console.log(`   ${warning}`));
} else {
  console.log('   ✅ No secrets exposed in environment');
}
console.log('');

// 2. Check credentials directory
console.log('2️⃣  Checking Credentials Storage...');
const credentialsDir = path.join(os.homedir(), '.ultron', 'credentials');

if (!fs.existsSync(credentialsDir)) {
  console.log('   ⚠️  Credentials directory not found');
  console.log('   Run: npm run init-credentials');
  warningsFound++;
} else {
  // Check directory permissions
  const dirStats = fs.statSync(credentialsDir);
  const dirMode = (dirStats.mode & parseInt('777', 8)).toString(8);
  
  if (dirMode !== '700') {
    console.log(`   ❌ Insecure directory permissions: ${dirMode} (should be 700)`);
    issuesFound++;
  } else {
    console.log('   ✅ Directory permissions correct (700)');
  }

  // Check file permissions
  const services = listStoredServices();
  console.log(`   📁 Found ${services.length} encrypted credential files`);
  
  services.forEach(service => {
    const filePath = path.join(credentialsDir, `${service}.enc`);
    const fileStats = fs.statSync(filePath);
    const fileMode = (fileStats.mode & parseInt('777', 8)).toString(8);
    
    if (fileMode !== '600') {
      console.log(`   ❌ ${service}.enc has insecure permissions: ${fileMode} (should be 600)`);
      issuesFound++;
    } else {
      console.log(`   ✅ ${service}.enc permissions correct`);
    }
  });
}
console.log('');

// 3. Check .env file
console.log('3️⃣  Checking .env File...');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const secretPatterns = [
    /CLIENT_SECRET=["']?(?!your_|""|'')[^"'\s]+/,
    /API_KEY=["']?(?!your_|""|'')[^"'\s]+/,
    /SECRET_KEY=["']?(?!your_|""|'')[^"'\s]+/,
    /TOKEN=["']?(?!your_|""|'')[^"'\s]+/,
    /PASSWORD=["']?(?!your_|""|'')[^"'\s]+/,
  ];
  
  let foundSecrets = false;
  lines.forEach((line, index) => {
    if (line.trim().startsWith('#')) return;
    
    secretPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        console.log(`   ❌ Line ${index + 1}: Potential secret exposed`);
        console.log(`      ${line.substring(0, 50)}...`);
        issuesFound++;
        foundSecrets = true;
      }
    });
  });
  
  if (!foundSecrets) {
    console.log('   ✅ No secrets found in .env file');
  }
} else {
  console.log('   ⚠️  .env file not found');
  warningsFound++;
}
console.log('');

// 4. Check .gitignore
console.log('4️⃣  Checking .gitignore...');
const gitignorePath = path.join(process.cwd(), '.gitignore');

if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const requiredEntries = ['.env', '.env.local', '*.enc', 'credentials/'];
  const missingEntries: string[] = [];
  
  requiredEntries.forEach(entry => {
    if (!gitignoreContent.includes(entry)) {
      missingEntries.push(entry);
    }
  });
  
  if (missingEntries.length > 0) {
    console.log('   ⚠️  Missing .gitignore entries:');
    missingEntries.forEach(entry => console.log(`      - ${entry}`));
    warningsFound += missingEntries.length;
  } else {
    console.log('   ✅ All sensitive files are in .gitignore');
  }
} else {
  console.log('   ❌ .gitignore file not found');
  issuesFound++;
}
console.log('');

// 5. Summary
console.log('='.repeat(60));
console.log('📊 Audit Summary\n');

if (issuesFound === 0 && warningsFound === 0) {
  console.log('✅ No security issues found!');
  console.log('   Your ULTRON installation is secure.');
} else {
  if (issuesFound > 0) {
    console.log(`❌ Found ${issuesFound} security issue(s) that need immediate attention`);
  }
  if (warningsFound > 0) {
    console.log(`⚠️  Found ${warningsFound} warning(s) that should be addressed`);
  }
  console.log('');
  console.log('📖 For more information, see: SECURITY.md');
}

console.log('');
console.log('='.repeat(60));

// Exit with error code if issues found
process.exit(issuesFound > 0 ? 1 : 0);
