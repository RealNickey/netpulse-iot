import { Aedes } from "aedes";
import { createServer, Server } from "net";
import { dbService } from "./db";
import { evaluateTelemetry, TelemetryPayload } from "./evaluator";

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

export type MessageCallback = (data: {
  topic: string;
  payload: any;
  qos: number;
  packetSize: number;
  latencyMs: number;
  alerts: any[];
  nodeStatus: string;
}) => void;

class MqttBrokerManager {
  private broker: any = null;
  private tcpServer: Server | null = null;
  private messageListeners: MessageCallback[] = [];

  // Live network counters
  private metrics: NetworkMetrics = {
    totalPackets: 0,
    packetsPerSec: 0,
    totalBytes: 0,
    bytesPerSec: 0,
    connectedClients: 0,
    clientList: [],
    qos0Count: 0,
    qos1Count: 0,
    qos2Count: 0,
    avgLatencyMs: 0,
  };

  private recentPackets = 0;
  private recentBytes = 0;
  private latencySamples: number[] = [];

  constructor() {
    // Start 1-second interval to compute rates (packets/sec, bytes/sec)
    setInterval(() => {
      this.metrics.packetsPerSec = this.recentPackets;
      this.metrics.bytesPerSec = this.recentBytes;
      this.recentPackets = 0;
      this.recentBytes = 0;

      if (this.latencySamples.length > 0) {
        const sum = this.latencySamples.reduce((a, b) => a + b, 0);
        this.metrics.avgLatencyMs = Number((sum / this.latencySamples.length).toFixed(2));
        this.latencySamples = [];
      }
    }, 1000);
  }

  public async start(port = 1883): Promise<void> {
    this.broker = await Aedes.createBroker();
    this.setupEventHandlers();

    return new Promise((resolve, reject) => {
      this.tcpServer = createServer(this.broker.handle);

      this.tcpServer.listen(port, () => {
        console.log(`[MQTT Broker] Embedded Aedes broker listening on TCP port ${port}`);
        resolve();
      });

      this.tcpServer.on("error", (err) => {
        console.error("[MQTT Broker] TCP Server error:", err);
        reject(err);
      });
    });
  }

  private setupEventHandlers() {
    // Client Connect
    this.broker.on("client", (client: any) => {
      const clientId = client ? client.id : "unknown";
      if (!this.metrics.clientList.includes(clientId)) {
        this.metrics.clientList.push(clientId);
      }
      this.metrics.connectedClients = this.metrics.clientList.length;
      console.log(`[MQTT Broker] Client connected: ${clientId} (Total: ${this.metrics.connectedClients})`);
    });

    // Client Disconnect
    this.broker.on("clientDisconnect", (client: any) => {
      const clientId = client ? client.id : "unknown";
      this.metrics.clientList = this.metrics.clientList.filter((id) => id !== clientId);
      this.metrics.connectedClients = this.metrics.clientList.length;
      console.log(`[MQTT Broker] Client disconnected: ${clientId}`);
    });

    // Packet Published
    this.broker.on("publish", (packet: any, client: any) => {
      // Ignore broker internal heartbeat topics ($SYS)
      if (packet.topic.startsWith("$SYS")) return;

      const payloadBuf = packet.payload;
      const packetSize = payloadBuf ? payloadBuf.length : 0;
      const qos = packet.qos ?? 0;

      this.metrics.totalPackets++;
      this.metrics.totalBytes += packetSize;
      this.recentPackets++;
      this.recentBytes += packetSize;

      if (qos === 0) this.metrics.qos0Count++;
      else if (qos === 1) this.metrics.qos1Count++;
      else if (qos === 2) this.metrics.qos2Count++;

      // Parse payload if it's JSON telemetry
      try {
        const payloadStr = payloadBuf.toString("utf8");
        const parsed = JSON.parse(payloadStr) as TelemetryPayload;

        // Calculate synthetic transport latency (from simulated node timestamp to broker arrival)
        const now = Date.now();
        const latencyMs = parsed.timestamp ? Math.max(1, now - parsed.timestamp) : Math.floor(Math.random() * 8 + 2);
        this.latencySamples.push(latencyMs);

        // Run threshold & anomaly evaluation
        const evalResult = evaluateTelemetry(parsed);

        // Update database with raw event
        dbService.logEvent({
          node_id: parsed.nodeId,
          topic: packet.topic,
          payload: payloadStr,
          qos,
          latency_ms: latencyMs,
          packet_size: packetSize,
        });

        // Upsert node status in SQLite
        dbService.upsertNode({
          node_id: parsed.nodeId,
          name: parsed.nodeName,
          type: parsed.nodeType,
          status: evalResult.nodeStatus,
          ip_address: parsed.ip,
          last_telemetry: payloadStr,
        });

        // Notify subscribers (WebSocket relay to React UI)
        for (const listener of this.messageListeners) {
          listener({
            topic: packet.topic,
            payload: parsed,
            qos,
            packetSize,
            latencyMs,
            alerts: evalResult.alerts,
            nodeStatus: evalResult.nodeStatus,
          });
        }
      } catch (err) {
        // Not a JSON payload, or formatting error
      }
    });
  }

  public onMessage(callback: MessageCallback) {
    this.messageListeners.push(callback);
  }

  public getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.tcpServer) {
        this.tcpServer.close(() => {
          this.broker.close(() => resolve());
        });
      } else {
        resolve();
      }
    });
  }
}

export const mqttBroker = new MqttBrokerManager();
