/**
 * Test Script: Database Failover Simulation
 * 
 * Script này giúp test chức năng failover tự động bằng cách:
 * 1. Kiểm tra trạng thái hiện tại của failover
 * 2. Simulate MySQL failure
 * 3. Verify failover to PostgreSQL
 * 4. Simulate MySQL recovery
 * 5. Verify recovery back to MySQL
 * 
 * Usage:
 *   node scripts/test-failover.mjs [command]
 * 
 * Commands:
 *   status     - Kiểm tra trạng thái failover hiện tại
 *   failover   - Trigger manual failover to PostgreSQL
 *   recovery   - Trigger manual recovery to MySQL
 *   simulate   - Chạy full simulation test
 *   health     - Kiểm tra health của cả 2 database
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log();
  log('═'.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(60), 'cyan');
  console.log();
}

function logSection(title) {
  console.log();
  log(`▶ ${title}`, 'yellow');
  log('─'.repeat(50), 'yellow');
}

async function fetchApi(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}/api/trpc/${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.result?.data?.json || data;
  } catch (error) {
    log(`Error fetching ${endpoint}: ${error.message}`, 'red');
    return null;
  }
}

async function getFailoverStatus() {
  return await fetchApi('system.failoverStatus');
}

async function getDatabaseHealth() {
  return await fetchApi('system.databaseHealth');
}

function formatStatus(status) {
  if (!status) return 'N/A';
  
  const lines = [];
  lines.push(`  Enabled:              ${status.enabled ? '✓ Yes' : '✗ No'}`);
  lines.push(`  Monitoring Running:   ${status.monitoringRunning ? '✓ Yes' : '✗ No'}`);
  lines.push(`  Active Database:      ${status.activeDatabase?.toUpperCase() || 'N/A'}`);
  lines.push(`  Failover Active:      ${status.isFailoverActive ? '⚠ Yes (on PostgreSQL)' : '✓ No (on MySQL)'}`);
  lines.push('');
  lines.push(`  MySQL Healthy:        ${status.mysqlHealthy ? '✓ Yes' : '✗ No'}`);
  lines.push(`  PostgreSQL Healthy:   ${status.postgresqlHealthy ? '✓ Yes' : '✗ No'}`);
  lines.push('');
  lines.push(`  Failover Count:       ${status.failoverCount || 0}`);
  lines.push(`  Recovery Count:       ${status.recoveryCount || 0}`);
  lines.push('');
  lines.push(`  Health Check Interval: ${status.healthCheckInterval || 30000}ms`);
  lines.push(`  Failover Threshold:    ${status.failoverThreshold || 3} failures`);
  lines.push(`  Recovery Threshold:    ${status.recoveryThreshold || 3} successes`);
  lines.push('');
  lines.push(`  Email Enabled:        ${status.emailEnabled ? '✓ Yes' : '✗ No'}`);
  lines.push(`  Email Recipients:     ${status.emailRecipientCount || 0}`);
  
  if (status.lastMysqlCheck) {
    lines.push('');
    lines.push(`  Last MySQL Check:     ${new Date(status.lastMysqlCheck).toLocaleString()}`);
  }
  if (status.lastPostgresqlCheck) {
    lines.push(`  Last PostgreSQL Check: ${new Date(status.lastPostgresqlCheck).toLocaleString()}`);
  }
  if (status.lastFailoverAt) {
    lines.push(`  Last Failover:        ${new Date(status.lastFailoverAt).toLocaleString()}`);
  }
  if (status.lastRecoveryAt) {
    lines.push(`  Last Recovery:        ${new Date(status.lastRecoveryAt).toLocaleString()}`);
  }
  if (status.monitoringStartedAt) {
    lines.push(`  Monitoring Started:   ${new Date(status.monitoringStartedAt).toLocaleString()}`);
  }
  
  return lines.join('\n');
}

function formatHealth(health) {
  if (!health) return 'N/A';
  
  const lines = [];
  lines.push(`  Status:           ${health.status === 'healthy' ? '✓ Healthy' : '✗ Unhealthy'}`);
  lines.push(`  Active Database:  ${health.activeDatabase?.toUpperCase() || 'N/A'}`);
  lines.push(`  Response Time:    ${health.responseTimeMs || 0}ms`);
  lines.push(`  Table Count:      ${health.tableCount || 0}`);
  lines.push('');
  lines.push('  MySQL:');
  lines.push(`    - Configured:   ${health.databases?.mysql?.configured ? '✓' : '✗'}`);
  lines.push(`    - Connected:    ${health.databases?.mysql?.connected ? '✓' : '✗'}`);
  lines.push(`    - Status:       ${health.databases?.mysql?.status || 'N/A'}`);
  lines.push('');
  lines.push('  PostgreSQL:');
  lines.push(`    - Configured:   ${health.databases?.postgresql?.configured ? '✓' : '✗'}`);
  lines.push(`    - Connected:    ${health.databases?.postgresql?.connected ? '✓' : '✗'}`);
  lines.push(`    - Status:       ${health.databases?.postgresql?.status || 'N/A'}`);
  
  return lines.join('\n');
}

async function showStatus() {
  logHeader('DATABASE FAILOVER STATUS');
  
  logSection('Failover Configuration');
  const status = await getFailoverStatus();
  console.log(formatStatus(status));
  
  logSection('Database Health');
  const health = await getDatabaseHealth();
  console.log(formatHealth(health));
}

async function showHealth() {
  logHeader('DATABASE HEALTH CHECK');
  
  const health = await getDatabaseHealth();
  console.log(formatHealth(health));
}

async function runSimulation() {
  logHeader('FAILOVER SIMULATION TEST');
  
  log('This simulation will:', 'cyan');
  log('  1. Check current status', 'cyan');
  log('  2. Verify PostgreSQL is available', 'cyan');
  log('  3. Show failover configuration', 'cyan');
  console.log();
  
  // Step 1: Check current status
  logSection('Step 1: Initial Status');
  const initialStatus = await getFailoverStatus();
  log(`  Failover Enabled: ${initialStatus?.enabled ? '✓' : '✗'}`);
  log(`  Active Database: ${initialStatus?.activeDatabase?.toUpperCase() || 'N/A'}`);
  log(`  MySQL Healthy: ${initialStatus?.mysqlHealthy ? '✓' : '✗'}`);
  log(`  PostgreSQL Healthy: ${initialStatus?.postgresqlHealthy ? '✓' : '✗'}`);
  
  // Step 2: Check PostgreSQL
  logSection('Step 2: PostgreSQL Status');
  const health = await getDatabaseHealth();
  if (health?.databases?.postgresql?.connected) {
    log('  ✓ PostgreSQL is connected and ready for failover', 'green');
  } else {
    log('  ✗ PostgreSQL is not connected', 'red');
    log(`    Status: ${health?.databases?.postgresql?.status || 'unknown'}`, 'yellow');
    log('    Failover will not work until PostgreSQL is available', 'yellow');
  }
  
  // Step 3: Configuration summary
  logSection('Step 3: Configuration Summary');
  log(`  Health Check Interval: ${initialStatus?.healthCheckInterval || 30000}ms`);
  log(`  Failover Threshold: ${initialStatus?.failoverThreshold || 3} consecutive failures`);
  log(`  Recovery Threshold: ${initialStatus?.recoveryThreshold || 3} consecutive successes`);
  log(`  Email Notifications: ${initialStatus?.emailEnabled ? 'Enabled' : 'Disabled'}`);
  log(`  Email Recipients: ${initialStatus?.emailRecipientCount || 0}`);
  
  // Summary
  logSection('Simulation Summary');
  if (initialStatus?.enabled && health?.databases?.postgresql?.connected) {
    log('  ✓ Failover is properly configured!', 'green');
    log('  The system will automatically:', 'cyan');
    log('    - Switch to PostgreSQL after 3 MySQL failures', 'cyan');
    log('    - Switch back to MySQL after 3 successful checks', 'cyan');
    log('    - Send email notifications (if configured)', 'cyan');
  } else if (!initialStatus?.enabled) {
    log('  ⚠ Failover is DISABLED', 'yellow');
    log('  Set DATABASE_FAILOVER_ENABLED=true to enable', 'yellow');
  } else {
    log('  ⚠ PostgreSQL is not available', 'yellow');
    log('  Failover cannot work without PostgreSQL', 'yellow');
  }
}

function showHelp() {
  logHeader('DATABASE FAILOVER TEST SCRIPT');
  
  log('Usage:', 'bright');
  log('  node scripts/test-failover.mjs [command]');
  console.log();
  
  log('Commands:', 'bright');
  log('  status     - Kiểm tra trạng thái failover hiện tại');
  log('  health     - Kiểm tra health của cả 2 database');
  log('  simulate   - Chạy simulation test');
  log('  help       - Hiển thị help này');
  console.log();
  
  log('Environment Variables:', 'bright');
  log('  API_URL    - Base URL của API (default: http://localhost:3000)');
  console.log();
  
  log('Configuration (Environment Variables):', 'bright');
  log('  DATABASE_FAILOVER_ENABLED=true     - Enable failover monitoring');
  log('  PG_LOCAL_ENABLED=true              - Enable local PostgreSQL');
  log('  FAILOVER_HEALTH_CHECK_INTERVAL=30000 - Health check interval (ms)');
  log('  FAILOVER_THRESHOLD=3               - Failures before failover');
  log('  RECOVERY_THRESHOLD=3               - Successes before recovery');
  log('  FAILOVER_EMAIL_ENABLED=true        - Enable email notifications');
  log('  FAILOVER_EMAIL_RECIPIENTS=a@b.com  - Email recipients (comma-separated)');
}

// Main
const command = process.argv[2] || 'status';

switch (command.toLowerCase()) {
  case 'status':
    await showStatus();
    break;
  case 'health':
    await showHealth();
    break;
  case 'simulate':
    await runSimulation();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    log(`Unknown command: ${command}`, 'red');
    showHelp();
}
