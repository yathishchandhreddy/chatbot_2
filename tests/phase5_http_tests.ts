console.log('=== RUNNING PHASE 5 HTTP & SECURITY INTEGRATION TESTS ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}: ${detail}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name}: ${detail}`);
    failed++;
  }
}

async function runHttpTests() {
  const baseUrl = 'http://localhost:3000';

  // Test I: Security Check - Student Attempts Dataset Edit Without Admin Auth
  try {
    const resI = await fetch(`${baseUrl}/api/admin/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'OFFICIAL_NOTICES',
        title: 'Unauthorized Student Record',
        content: 'This should be blocked.',
      }),
    });

    assert(
      resI.status === 401,
      'Test I (Student Modification Security Check)',
      `Backend correctly rejected unauthenticated write request with HTTP ${resI.status}`
    );
  } catch (e: any) {
    assert(false, 'Test I (Student Modification Security Check)', `Request failed: ${e.message}`);
  }

  // Test J: Existing Admin Portal APIs Functionality
  try {
    // 1. Admin Login
    const loginRes = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vsbec.edu.in', secretKey: 'admin123' }),
    });

    const loginData = await loginRes.json();
    const token = loginData.token;

    assert(
      loginRes.ok && !!token,
      'Test J1 (Admin Login API)',
      'Successfully authenticated admin@vsbec.edu.in and received session token'
    );

    // 2. Fetch Dataset Records Overview
    const overviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const overviewData = await overviewRes.json();

    assert(
      overviewRes.ok && typeof overviewData.stats?.totalRecords === 'number',
      'Test J2 (Admin Overview API)',
      `Retrieved overview stats containing ${overviewData.stats?.totalRecords} dataset records`
    );

    // 3. Chat API - Student Dataset Query
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is Bus Route 42?' }),
    });
    const chatData = await chatRes.json();

    assert(
      chatRes.ok && chatData.reply.includes('Bus Route 42'),
      'Test J3 (Student Chatbot Dataset Search API)',
      'Student chatbot successfully returned verified dataset answer for Bus Route 42'
    );
  } catch (e: any) {
    assert(false, 'Test J (Admin Portal Functionality)', `HTTP test failed: ${e.message}`);
  }

  console.log(`\n=== HTTP SECURITY & ADMIN SUITE SUMMARY: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runHttpTests();
