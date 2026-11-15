import { Database } from "bun:sqlite";
import path from "path";

// Initialize SQLite database
const dbPath = path.join(process.cwd(), "iot_events.sqlite");
export const db = new Database(dbPath, { create: true });

// Enable Write-Ahead Logging for maximum concurrent performance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    node_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    payload TEXT NOT NULL,
    qos INTEGER DEFAULT 0,
    latency_ms REAL DEFAULT 0,
    packet_size INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    node_id TEXT NOT NULL,
    severity TEXT NOT NULL, -- INFO, WARNING, CRITICAL
    type TEXT NOT NULL,     -- THERMAL, POWER, INTRUSION, NETWORK, HUMIDITY
    message TEXT NOT NULL,
    value REAL,
    threshold REAL,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS node_status (
    node_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'ONLINE', -- ONLINE, WARNING, CRITICAL, OFFLINE
    ip_address TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    packet_count INTEGER DEFAULT 0,
    last_telemetry TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_events_node ON events(node_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged);
`);

// Prepared statements for high-throughput queries
const insertEventStmt = db.prepare(`
  INSERT INTO events (node_id, topic, payload, qos, latency_ms, packet_size)
  VALUES ($node_id, $topic, $payload, $qos, $latency_ms, $packet_size)
`);

const insertAlertStmt = db.prepare(`
  INSERT INTO alerts (node_id, severity, type, message, value, threshold)
  VALUES ($node_id, $severity, $type, $message, $value, $threshold)
`);

const upsertNodeStmt = db.prepare(`
  INSERT INTO node_status (node_id, name, type, status, ip_address, last_seen, packet_count, last_telemetry)
  VALUES ($node_id, $name, $type, $status, $ip_address, CURRENT_TIMESTAMP, 1, $last_telemetry)
  ON CONFLICT(node_id) DO UPDATE SET
    status = $status,
    last_seen = CURRENT_TIMESTAMP,
    packet_count = packet_count + 1,
    last_telemetry = $last_telemetry
`);

const ackAlertStmt = db.prepare(`
  UPDATE alerts SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $id
`);

export interface EventRecord {
  id: number;
  timestamp: string;
  node_id: string;
  topic: string;
  payload: string;
  qos: number;
  latency_ms: number;
  packet_size: number;
}

export interface AlertRecord {
  id: number;
  timestamp: string;
  node_id: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  message: string;
  value: number | null;
  threshold: number | null;
  acknowledged: number;
  acknowledged_at: string | null;
}

export interface NodeRecord {
  node_id: string;
  name: string;
  type: string;
  status: "ONLINE" | "WARNING" | "CRITICAL" | "OFFLINE";
  ip_address: string;
  last_seen: string;
  packet_count: number;
  last_telemetry: string;
}

export const dbService = {
  logEvent(data: {
    node_id: string;
    topic: string;
    payload: string;
    qos: number;
    latency_ms: number;
    packet_size: number;
  }) {
    const res = insertEventStmt.run({
      $node_id: data.node_id,
      $topic: data.topic,
      $payload: data.payload,
      $qos: data.qos,
      $latency_ms: data.latency_ms,
      $packet_size: data.packet_size,
    });
    return res.lastInsertRowid;
  },

  createAlert(data: {
    node_id: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    type: string;
    message: string;
    value?: number;
    threshold?: number;
  }) {
    const res = insertAlertStmt.run({
      $node_id: data.node_id,
      $severity: data.severity,
      $type: data.type,
      $message: data.message,
      $value: data.value ?? null,
      $threshold: data.threshold ?? null,
    });
    return {
      id: Number(res.lastInsertRowid),
      timestamp: new Date().toISOString(),
      ...data,
      acknowledged: 0,
      acknowledged_at: null,
    };
  },

  upsertNode(node: {
    node_id: string;
    name: string;
    type: string;
    status: "ONLINE" | "WARNING" | "CRITICAL" | "OFFLINE";
    ip_address: string;
    last_telemetry: string;
  }) {
    upsertNodeStmt.run({
      $node_id: node.node_id,
      $name: node.name,
      $type: node.type,
      $status: node.status,
      $ip_address: node.ip_address,
      $last_telemetry: node.last_telemetry,
    });
  },

  acknowledgeAlert(id: number) {
    ackAlertStmt.run({ $id: id });
  },

  getRecentEvents(limit = 100, severity?: string): EventRecord[] {
    let query = "SELECT * FROM events ORDER BY id DESC LIMIT $limit";
    return db.query(query).all({ $limit: limit }) as EventRecord[];
  },

  getAlerts(limit = 50, onlyUnack = false): AlertRecord[] {
    const query = onlyUnack
      ? "SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY id DESC LIMIT $limit"
      : "SELECT * FROM alerts ORDER BY id DESC LIMIT $limit";
    return db.query(query).all({ $limit: limit }) as AlertRecord[];
  },

  getAllNodes(): NodeRecord[] {
    return db.query("SELECT * FROM node_status ORDER BY node_id ASC").all() as NodeRecord[];
  },

  getStats() {
    const totalEvents = db.query("SELECT COUNT(*) as count FROM events").get() as { count: number };
    const totalAlerts = db.query("SELECT COUNT(*) as count FROM alerts").get() as { count: number };
    const unackAlerts = db.query("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0").get() as { count: number };
    const qosStats = db.query("SELECT qos, COUNT(*) as count FROM events GROUP BY qos").all() as { qos: number; count: number }[];
    const avgLatency = db.query("SELECT AVG(latency_ms) as avg_latency FROM (SELECT latency_ms FROM events ORDER BY id DESC LIMIT 500)").get() as { avg_latency: number };

    return {
      totalEvents: totalEvents?.count || 0,
      totalAlerts: totalAlerts?.count || 0,
      unackAlerts: unackAlerts?.count || 0,
      qosStats,
      avgLatency: Number((avgLatency?.avg_latency || 0).toFixed(2)),
    };
  },

  clearHistory() {
    db.exec("DELETE FROM events; DELETE FROM alerts;");
  }
};
