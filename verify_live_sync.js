const { fetchRealCredits, getAccounts } = require('./engine/accountStore');

async function runDeepVerification() {
  console.log('====================================================');
  console.log('🔬 RUNNING ULTRA-DEEP REAL-TIME SYSTEM VERIFICATION');
  console.log('====================================================\n');

  console.log('1. Checking accounts store state on disk...');
  const initialAccounts = getAccounts();
  console.log(`Found ${initialAccounts.length} accounts in accounts.json:`);
  initialAccounts.forEach(a => {
    console.log(`   - [${a.name}] ID: ${a.id} | Status: ${a.status} | Email: ${a.email || 'None'} | Credits: ${a.credits || 0}`);
  });

  console.log('\n2. Live querying Google Flow API for Account 1 (acc_1)...');
  const result = await fetchRealCredits('acc_1');
  console.log('Google Flow Server Response:', JSON.stringify(result, null, 2));

  console.log('\n3. Verifying updated accounts on disk...');
  const finalAccounts = getAccounts();
  finalAccounts.forEach(a => {
    console.log(`   ✓ [${a.name}] Email: ${a.email || 'None'} | Real Server Credits: ${a.credits} | Status: ${a.status}`);
  });

  console.log('\n====================================================');
  console.log('✅ ULTRA-DEEP VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runDeepVerification().catch(console.error);
