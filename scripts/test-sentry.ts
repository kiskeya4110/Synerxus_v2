/**
 * Test Sentry Integration
 *
 * Run with: npx tsx scripts/test-sentry.ts
 *
 * This will send a test error to Sentry to verify the integration works.
 */

import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  console.log('❌ SENTRY_DSN not set');
  console.log('');
  console.log('To set up Sentry:');
  console.log('1. Go to https://sentry.io and create an account');
  console.log('2. Create a Node.js project');
  console.log('3. Copy the DSN from Project Settings → Client Keys');
  console.log('4. Add to Replit Secrets: SENTRY_DSN=your-dsn-here');
  console.log('');
  process.exit(1);
}

console.log('🔧 Initializing Sentry...');

Sentry.init({
  dsn: SENTRY_DSN,
  environment: 'test',
  release: 'test-1.0.0',
});

console.log('✅ Sentry initialized');
console.log('');
console.log('📤 Sending test error...');

try {
  // Capture a test exception
  Sentry.captureException(new Error('Test error from volunteer platform - please ignore'));

  // Also send a test message
  Sentry.captureMessage('Test message: Sentry integration verified!', 'info');

  console.log('✅ Test error sent');
  console.log('');
  console.log('🔍 Check your Sentry dashboard at:');
  console.log('   https://sentry.io → Your Project → Issues');
  console.log('');
  console.log('You should see:');
  console.log('  - "Test error from volunteer platform - please ignore"');
  console.log('  - "Test message: Sentry integration verified!"');
  console.log('');

  // Wait for Sentry to flush
  console.log('⏳ Waiting for Sentry to send events...');

  Sentry.flush(5000).then(() => {
    console.log('✅ All events sent successfully!');
    console.log('');
    console.log('🎉 Sentry integration is working!');
    process.exit(0);
  });

} catch (error) {
  console.error('❌ Failed to send test error:', error);
  process.exit(1);
}
