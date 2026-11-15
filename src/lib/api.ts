export interface TelemetryData {
  temperature?: number;
  humidity?: number;
  cpuLoad?: number;
  fanSpeedRpm?: number;
  vibration?: number;
  powerWatts?: number;
  voltage?: number;
  currentAmps?: number;
  doorStatus?: "CLOSED" | "OPEN" | "UNAUTHORIZED_OPEN";
  motionDetected?: boolean;
  packetLossPct?: number;
  airflowCfm?: number;
  chillerTemp?: number;
}

export interface NodeStatus {
  node_id: string;
  name: string;
  type: string;
  status: "ONLINE" | "WARNING" | "CRITICAL" | "OFFLINE";
  ip_address: string;
  last_seen: string;
  packet_count: number;
  last_telemetry: string;
}

export interface Alert {
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

export interface EventLog {
  id: number;
  timestamp: string;
  node_id: string;
  topic: string;
  payload: string;
  qos: number;
  latency_ms: number;
  packet_size: number;
}

export interface NetworkMetrics {
  totalPackets: number;
  packetsPerSec: number;
  totalBytes: number;
  bytesPerSec: number;
  connectedClients: number;
  clientList: string[];
  qos0Count: number;
  qos1Count: number;
  qos2Count: number;
  avgLatencyMs: number;
}

export interface SimNode {
  id: string;
  name: string;
  type: string;
  temp: number;
  power: number;
  door: string;
  vibration: number;
  loss: number;
}

export interface SimStatus {
  isRunning: boolean;
  activeAnomaly: string;
  publishIntervalMs: number;
  qosLevel: number;
  nodeCount: number;
  nodes: SimNode[];
}

const API_BASE = "http://localhost:3001";
const WS_BASE = "ws://localhost:3001/ws";

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  return res.json();
}

export async function fetchNodes(): Promise<NodeStatus[]> {
  const res = await fetch(`${API_BASE}/api/nodes`);
  return res.json();
}

export async function fetchEvents(limit = 100): Promise<EventLog[]> {
  const res = await fetch(`${API_BASE}/api/events?limit=${limit}`);
  return res.json();
}

export async function fetchAlerts(unackOnly = false): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/api/alerts?unack=${unackOnly ? "1" : "0"}`);
  return res.json();
}

export async function acknowledgeAlert(id: number) {
  const res = await fetch(`${API_BASE}/api/alerts/${id}/ack`, { method: "POST" });
  return res.json();
}

export async function acknowledgeAllAlerts() {
  const res = await fetch(`${API_BASE}/api/alerts/ack-all`, { method: "POST" });
  return res.json();
}

export async function triggerAnomaly(anomaly: string) {
  const res = await fetch(`${API_BASE}/api/simulation/anomaly`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anomaly }),
  });
  return res.json();
}

export async function updateSimConfig(config: { intervalMs?: number; qos?: 0 | 1 }) {
  const res = await fetch(`${API_BASE}/api/simulation/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function clearDbHistory() {
  const res = await fetch(`${API_BASE}/api/clear`, { method: "POST" });
  return res.json();
}

export function getExportCsvUrl() {
  return `${API_BASE}/api/export/csv`;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;
  public isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(WS_BASE);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit("connection", { connected: true });
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
          this.emit("message", data);
        } catch (e) {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit("connection", { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.emit("connection", { connected: false });
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 2000);
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => cb(data));
    }
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const wsClient = new WebSocketClient();
