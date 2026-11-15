import mqtt, { MqttClient } from "mqtt";
import { TelemetryPayload } from "./evaluator";

export type AnomalyType =
  | "NONE"
  | "HVAC_FAILURE"
  | "PDU_SURGE"
  | "SECURITY_BREACH"
  | "SEISMIC_SHAKE"
  | "NETWORK_CONGESTION";

interface NodeState {
  id: string;
  name: string;
  type: TelemetryPayload["nodeType"];
  ip: string;
  topic: string;
  baseTemp: number;
  currentTemp: number;
  basePower: number;
  currentPower: number;
  baseHumidity: number;
  currentHumidity: number;
  doorStatus: "CLOSED" | "OPEN" | "UNAUTHORIZED_OPEN";
  vibration: number;
  packetLossPct: number;
  cpuLoad: number;
  fanRpm: number;
}

class IotNetworkSimulator {
  private client: MqttClient | null = null;
  private timer: Timer | null = null;
  private isRunning = false;
  private publishIntervalMs = 1500;
  private qosLevel: 0 | 1 = 0;
  private activeAnomaly: AnomalyType = "NONE";

  private nodes: NodeState[] = [
    {
      id: "rack-01",
      name: "Compute Cluster Alpha",
      type: "COMPUTE_RACK",
      ip: "192.168.10.11",
      topic: "datacenter/rack/rack-01/telemetry",
      baseTemp: 24.5,
      currentTemp: 24.5,
      basePower: 1200,
      currentPower: 1200,
      baseHumidity: 45,
      currentHumidity: 45,
      doorStatus: "CLOSED",
      vibration: 0.05,
      packetLossPct: 0.02,
      cpuLoad: 35,
      fanRpm: 3200,
    },
    {
      id: "rack-02",
      name: "SAN Storage Matrix",
      type: "STORAGE_RACK",
      ip: "192.168.10.12",
      topic: "datacenter/rack/rack-02/telemetry",
      baseTemp: 26.0,
      currentTemp: 26.0,
      basePower: 950,
      currentPower: 950,
      baseHumidity: 43,
      currentHumidity: 43,
      doorStatus: "CLOSED",
      vibration: 0.1,
      packetLossPct: 0.01,
      cpuLoad: 28,
      fanRpm: 2800,
    },
    {
      id: "rack-03",
      name: "AI Inference Blade",
      type: "AI_BLADE",
      ip: "192.168.10.13",
      topic: "datacenter/rack/rack-03/telemetry",
      baseTemp: 29.0,
      currentTemp: 29.0,
      basePower: 2100,
      currentPower: 2100,
      baseHumidity: 44,
      currentHumidity: 44,
      doorStatus: "CLOSED",
      vibration: 0.08,
      packetLossPct: 0.04,
      cpuLoad: 68,
      fanRpm: 5200,
    },
    {
      id: "rack-04",
      name: "Core Fiber Switch",
      type: "NETWORK_SWITCH",
      ip: "192.168.10.14",
      topic: "datacenter/rack/rack-04/telemetry",
      baseTemp: 27.2,
      currentTemp: 27.2,
      basePower: 650,
      currentPower: 650,
      baseHumidity: 42,
      currentHumidity: 42,
      doorStatus: "CLOSED",
      vibration: 0.02,
      packetLossPct: 0.01,
      cpuLoad: 45,
      fanRpm: 4000,
    },
    {
      id: "pdu-main",
      name: "Main PDU Unit 01",
      type: "PDU",
      ip: "192.168.10.50",
      topic: "datacenter/pdu/pdu-main/telemetry",
      baseTemp: 25.0,
      currentTemp: 25.0,
      basePower: 2800,
      currentPower: 2800,
      baseHumidity: 40,
      currentHumidity: 40,
      doorStatus: "CLOSED",
      vibration: 0.01,
      packetLossPct: 0.0,
      cpuLoad: 12,
      fanRpm: 1800,
    },
    {
      id: "hvac-01",
      name: "In-Row Precision Chiller",
      type: "HVAC",
      ip: "192.168.10.60",
      topic: "datacenter/hvac/hvac-01/telemetry",
      baseTemp: 16.5,
      currentTemp: 16.5,
      basePower: 1400,
      currentPower: 1400,
      baseHumidity: 48,
      currentHumidity: 48,
      doorStatus: "CLOSED",
      vibration: 0.3,
      packetLossPct: 0.0,
      cpuLoad: 18,
      fanRpm: 2400,
    },
    {
      id: "sec-entry",
      name: "Vault Access Controller",
      type: "SECURITY",
      ip: "192.168.10.99",
      topic: "datacenter/security/sec-entry/telemetry",
      baseTemp: 22.0,
      currentTemp: 22.0,
      basePower: 45,
      currentPower: 45,
      baseHumidity: 45,
      currentHumidity: 45,
      doorStatus: "CLOSED",
      vibration: 0.01,
      packetLossPct: 0.0,
      cpuLoad: 8,
      fanRpm: 0,
    },
  ];

  public async start(brokerUrl = "mqtt://localhost:1883"): Promise<void> {
    if (this.isRunning) return;

    return new Promise((resolve) => {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `sim_gateway_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2000,
      });

      this.client.on("connect", () => {
        console.log("[IoT Simulator] Connected to MQTT broker. Starting telemetry stream...");
        this.isRunning = true;
        this.scheduleTick();
        resolve();
      });

      this.client.on("error", (err) => {
        console.warn("[IoT Simulator] MQTT Client connection error:", err.message);
      });
    });
  }

  private scheduleTick() {
    if (!this.isRunning) return;

    this.timer = setTimeout(() => {
      this.publishAllNodes();
      this.scheduleTick();
    }, this.publishIntervalMs);
  }

  private publishAllNodes() {
    if (!this.client || !this.client.connected) return;

    // Apply drift & anomaly dynamics
    this.updateNodeStates();

    for (const node of this.nodes) {
      const payload: TelemetryPayload = {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        ip: node.ip,
        timestamp: Date.now(),
        data: {
          temperature: Number(node.currentTemp.toFixed(1)),
          humidity: Number(node.currentHumidity.toFixed(1)),
          cpuLoad: Math.round(node.cpuLoad),
          fanSpeedRpm: Math.round(node.fanRpm),
          vibration: Number(node.vibration.toFixed(2)),
          powerWatts: Math.round(node.currentPower),
          voltage: node.id === "pdu-main" ? (this.activeAnomaly === "PDU_SURGE" ? 258 : 230) : 230,
          currentAmps: Number((node.currentPower / 230).toFixed(1)),
          doorStatus: node.doorStatus,
          motionDetected: node.doorStatus === "UNAUTHORIZED_OPEN",
          packetLossPct: Number(node.packetLossPct.toFixed(2)),
          airflowCfm: node.id === "hvac-01" ? (this.activeAnomaly === "HVAC_FAILURE" ? 180 : 1850) : undefined,
          chillerTemp: node.id === "hvac-01" ? Number(node.currentTemp.toFixed(1)) : undefined,
        },
        anomalyFlag: this.activeAnomaly !== "NONE",
      };

      const jsonStr = JSON.stringify(payload);
      this.client.publish(node.topic, jsonStr, { qos: this.qosLevel });
    }
  }

  private updateNodeStates() {
    for (const node of this.nodes) {
      // Natural jitter (+/- 0.2)
      const jitter = (Math.random() - 0.5) * 0.4;
      const powerJitter = (Math.random() - 0.5) * 20;

      switch (this.activeAnomaly) {
        case "HVAC_FAILURE":
          if (node.id === "hvac-01") {
            node.currentTemp = Math.min(38, node.currentTemp + 0.8);
            node.fanRpm = Math.max(300, node.fanRpm - 200);
          } else if (node.type.includes("RACK") || node.type === "AI_BLADE") {
            // Rapid thermal climb
            node.currentTemp = Math.min(48.5, node.currentTemp + 0.6);
            node.fanRpm = 6500; // Fans throttling to max
          }
          break;

        case "PDU_SURGE":
          if (node.id === "pdu-main") {
            node.currentPower = 4250 + Math.random() * 300; // Overload!
            node.currentTemp = Math.min(44, node.currentTemp + 0.5);
          } else {
            node.currentPower = node.basePower * 1.35;
          }
          break;

        case "SECURITY_BREACH":
          if (node.id === "sec-entry") {
            node.doorStatus = "UNAUTHORIZED_OPEN";
          }
          break;

        case "SEISMIC_SHAKE":
          if (node.id === "rack-02") {
            node.vibration = 8.5 + (Math.random() - 0.5) * 1.5;
          }
          break;

        case "NETWORK_CONGESTION":
          if (node.id === "rack-04") {
            node.packetLossPct = 34.2 + (Math.random() - 0.5) * 8.0;
            node.cpuLoad = 96;
          }
          break;

        case "NONE":
        default:
          // Cool down slowly toward baseline
          node.currentTemp += (node.baseTemp - node.currentTemp) * 0.15 + jitter;
          node.currentPower += (node.basePower - node.currentPower) * 0.2 + powerJitter;
          node.currentHumidity = node.baseHumidity + jitter * 2;
          node.doorStatus = "CLOSED";
          node.vibration = Math.max(0.01, node.vibration * 0.5);
          node.packetLossPct = Math.max(0.01, node.packetLossPct * 0.5);
          break;
      }
    }
  }

  public setAnomaly(anomaly: AnomalyType) {
    this.activeAnomaly = anomaly;
    console.log(`[IoT Simulator] Anomaly set to: ${anomaly}`);
    // Force immediate broadcast
    this.publishAllNodes();
  }

  public setPublishInterval(intervalMs: number) {
    this.publishIntervalMs = Math.max(200, Math.min(10000, intervalMs));
  }

  public setQoS(qos: 0 | 1) {
    this.qosLevel = qos;
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      activeAnomaly: this.activeAnomaly,
      publishIntervalMs: this.publishIntervalMs,
      qosLevel: this.qosLevel,
      nodeCount: this.nodes.length,
      nodes: this.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        temp: Number(n.currentTemp.toFixed(1)),
        power: Math.round(n.currentPower),
        door: n.doorStatus,
        vibration: Number(n.vibration.toFixed(2)),
        loss: Number(n.packetLossPct.toFixed(2)),
      })),
    };
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.client) this.client.end();
  }
}

export const simulator = new IotNetworkSimulator();
