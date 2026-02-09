import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const checks = [
    {idx: 'idx_iot_device_data_device', table: 'iot_device_data', cols: ['device_id', 'recorded_at']},
    {idx: 'idx_alert_analytics_type', table: 'alert_analytics', cols: ['alert_type']},
    {idx: 'idx_alert_escalation_alert', table: 'alert_escalation_logs', cols: ['alert_id']},
    {idx: 'idx_alert_notif_logs_alert', table: 'alert_notification_logs', cols: ['alert_id']},
    {idx: 'idx_alert_webhook_logs_webhook', table: 'alert_webhook_logs', cols: ['webhook_id']},
    {idx: 'idx_kpi_alert_stats_date', table: 'kpi_alert_stats', cols: ['date']},
  ];
  for (const c of checks) {
    try {
      const [dbCols] = await conn.query(`SHOW COLUMNS FROM ${c.table}`);
      const colNames = dbCols.map(r => r.Field);
      const missing = c.cols.filter(n => colNames.indexOf(n) === -1);
      
      // Also check if index already exists
      const [indexes] = await conn.query(`SHOW INDEX FROM ${c.table}`);
      const idxNames = indexes.map(r => r.Key_name);
      const idxExists = idxNames.indexOf(c.idx) !== -1;
      
      console.log(`${c.idx}: cols=${missing.length === 0 ? 'OK' : 'MISSING: ' + missing.join(',')} | idx=${idxExists ? 'EXISTS' : 'MISSING'}`);
    } catch(e) { 
      console.log(`${c.idx}: ERROR - ${e.message}`); 
    }
  }
  await conn.end();
}
main().catch(e => console.error(e));
