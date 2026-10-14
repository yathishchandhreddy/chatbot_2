/**
 * Phase 3: Secure Admin Portal Verification Suite
 */

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 3: SECURE ADMIN PORTAL AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      if (details) console.error(`       Details: ${details}`);
      failed++;
    }
  }

  // 1. Unauthenticated access protection
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/admin/overview`);
    assert(
      'Test 1: Unauthenticated request to /api/admin/overview is rejected (401)',
      unauthRes.status === 401,
      `Received status: ${unauthRes.status}`
    );
  } catch (e: any) {
    assert('Test 1: Unauthenticated request rejected', false, e.message);
  }

  // 2. Student / Invalid token access restriction
  try {
    const fakeTokenRes = await fetch(`${BASE_URL}/api/admin/records`, {
      headers: { Authorization: 'Bearer student_fake_token_12345' },
    });
    assert(
      'Test 2: Invalid/student token to /api/admin/records is rejected (401)',
      fakeTokenRes.status === 401,
      `Received status: ${fakeTokenRes.status}`
    );
  } catch (e: any) {
    assert('Test 2: Student access restriction', false, e.message);
  }

  // 3. Admin login rejection with wrong secret
  try {
    const badLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vsbec.edu.in', secretKey: 'wrong-passphrase' }),
    });
    assert(
      'Test 3: Admin login with incorrect credentials is denied (401)',
      badLoginRes.status === 401,
      `Received status: ${badLoginRes.status}`
    );
  } catch (e: any) {
    assert('Test 3: Incorrect credentials denial', false, e.message);
  }

  // 4. Authorized administrator access with correct secret
  let authToken = '';
  try {
    const validLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'principal@vsbec.edu.in', secretKey: 'vsb-admin-2026-secure' }),
    });
    const loginData = await validLoginRes.json();
    authToken = loginData.token || '';
    assert(
      'Test 4: Authorized administrator login succeeds with valid token',
      validLoginRes.status === 200 && !!authToken && loginData.user.role === 'SUPER_ADMIN',
      JSON.stringify(loginData)
    );
  } catch (e: any) {
    assert('Test 4: Admin login', false, e.message);
  }

  // 5. Authenticated access to overview stats
  try {
    const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const overviewData = await overviewRes.json();
    assert(
      'Test 5: Authorized administrator can fetch real repository stats',
      overviewRes.status === 200 && overviewData.stats.totalRecords >= 18,
      `Total records: ${overviewData.stats?.totalRecords}`
    );
  } catch (e: any) {
    assert('Test 5: Overview fetch', false, e.message);
  }

  // 6. Record creation - New record MUST default to UNVERIFIED
  let createdRecordId = '';
  try {
    const createRes = await fetch(`${BASE_URL}/api/admin/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        category: 'HOSTEL_INFO',
        title: 'New Boys Hostel Annex Block Expansion',
        content: 'Construction of a newly planned 200-bed student living annex block with solar water heating and high-speed Wi-Fi.',
        sourceUrl: 'https://vsbec.edu.in/hostel/',
        sourceOrganization: 'V.S.B. Engineering College Hostel Administration',
        verificationNotes: 'Submitted for administrative approval.',
      }),
    });
    const createData = await createRes.json();
    createdRecordId = createData.record?.id || '';
    assert(
      'Test 6: Newly created record strictly defaults to status UNVERIFIED and DRAFT',
      createRes.status === 201 &&
        createData.record?.status === 'UNVERIFIED' &&
        createData.record?.publicationStatus === 'DRAFT',
      `Status was: ${createData.record?.status}`
    );
  } catch (e: any) {
    assert('Test 6: Record creation', false, e.message);
  }

  // 7. Form validation - Reject empty or invalid records
  try {
    const badFormRes = await fetch(`${BASE_URL}/api/admin/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        category: 'HOSTEL_INFO',
        title: '', // Invalid empty title
        content: 'Short',
      }),
    });
    assert(
      'Test 7: Server form validation rejects records with invalid title/content (400)',
      badFormRes.status === 400,
      `Status was: ${badFormRes.status}`
    );
  } catch (e: any) {
    assert('Test 7: Form validation', false, e.message);
  }

  // 8. Unauthorized record approval denied (non-reviewer / without token)
  try {
    const unauthApproveRes = await fetch(`${BASE_URL}/api/admin/records/${createdRecordId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE', verificationNotes: 'Malicious student approve attempt' }),
    });
    assert(
      'Test 8: Unauthorized attempt to approve a record is strictly denied (401)',
      unauthApproveRes.status === 401,
      `Status was: ${unauthApproveRes.status}`
    );
  } catch (e: any) {
    assert('Test 8: Unauthorized review denial', false, e.message);
  }

  // 9. Authorized reviewer review audit
  try {
    const reviewRes = await fetch(`${BASE_URL}/api/admin/records/${createdRecordId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        verificationNotes: 'Cross-checked against Campus Planning Committee resolution dated 2026-10-10.',
      }),
    });
    const reviewData = await reviewRes.json();
    assert(
      'Test 9: Authorized reviewer audit successfully transitions record to VERIFIED and PUBLISHED',
      reviewRes.status === 200 &&
        reviewData.record?.status === 'VERIFIED' &&
        reviewData.record?.publicationStatus === 'PUBLISHED',
      `Status was: ${reviewData.record?.status}`
    );
  } catch (e: any) {
    assert('Test 9: Authorized review audit', false, e.message);
  }

  // 10. Document Library validation
  try {
    const badDocRes = await fetch(`${BASE_URL}/api/admin/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        originalName: 'virus.exe', // Unsupported format
        fileSize: 1024,
      }),
    });
    assert(
      'Test 10: Document library rejects unsupported file extensions (.exe) (400)',
      badDocRes.status === 400,
      `Status was: ${badDocRes.status}`
    );

    const validDocRes = await fetch(`${BASE_URL}/api/admin/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        originalName: 'Academic_Calendar_2026.pdf',
        fileSize: 1024 * 450, // 450 KB
        category: 'ACADEMIC_CALENDAR',
      }),
    });
    assert(
      'Test 11: Document library successfully accepts and stages valid PDF documents (201)',
      validDocRes.status === 201,
      `Status was: ${validDocRes.status}`
    );
  } catch (e: any) {
    assert('Test 10 & 11: Document library', false, e.message);
  }

  // 12. Existing Chatbot Functionality Test
  try {
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello PING! What are the library timings at VSB?',
        history: [],
      }),
    });
    const chatData = await chatRes.json();
    assert(
      'Test 12: Existing student Gemini chatbot endpoint (/api/chat) remains 100% operational',
      chatRes.status === 200 && typeof chatData.reply === 'string' && chatData.reply.length > 20,
      chatData.reply?.slice(0, 80)
    );
  } catch (e: any) {
    assert('Test 12: Chatbot functionality', false, e.message);
  }

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
