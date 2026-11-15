import { dbService, AlertRecord } from "./db";

export interface TelemetryPayload {
  nodeId: string;
  nodeName: string;
  nodeType: "COMPUTE_RACK" | "STORAGE_RACK" | "AI_BLADE" | "NETWORK_SWITCH" | "PDU" | "HVAC" | "SECURITY";
  ip: string;
  timestamp: number;
  data: {
    temperature?: number;      // Celsius
    humidity?: number;         // %
    cpuLoad?: number;          // %
    fanSpeedRpm?: number;      // RPM
    vibration?: number;        // g-force
    powerWatts?: number;       // Watts
    voltage?: number;          // Volts
    currentAmps?: number;      // Amps
    doorStatus?: "CLOSED" | "OPEN" | "UNAUTHORIZED_OPEN";
    motionDetected?: boolean;
    badgeId?: string | null;
    airflowCfm?: number;
    chillerTemp?: number;
    portTrafficMb?: number;
    packetLossPct?: number;
  };
  anomalyFlag?: boolean;
}

export interface EvaluationResult {
  nodeStatus: "ONLINE" | "WARNING" | "CRITICAL";
  alerts: AlertRecord[];
}

export function evaluateTelemetry(telemetry: TelemetryPayload): EvaluationResult {
  const alerts: AlertRecord[] = [];
  let worstStatus: "ONLINE" | "WARNING" | "CRITICAL" = "ONLINE";

  const { nodeId, data } = telemetry;

  // 1. Temperature Evaluation
  if (data.temperature !== undefined) {
    if (data.temperature >= 42) {
      worstStatus = "CRITICAL";
      const alert = dbService.createAlert({
        node_id: nodeId,
        severity: "CRITICAL",
        type: "THERMAL",
        message: `CRITICAL Thermal Runaway: Rack temperature reached ${data.temperature.toFixed(1)}°C (Limit: 42°C)`,
        value: data.temperature,
        threshold: 42,
      });
      alerts.push(alert);
    } else if (data.temperature >= 35) {
      if (worstStatus !== "CRITICAL") worstStatus = "WARNING";
      const alert = dbService.createAlert({
        node_id: nodeId,
        severity: "WARNING",
        type: "THERMAL",
        message: `High Thermal Warning: Rack temperature elevated at ${data.temperature.toFixed(1)}°C (Warning: 35°C)`,
        value: data.temperature,
        threshold: 35,
      });
      alerts.push(alert);
    }
  }

  // 2. Humidity Evaluation
  if (data.humidity !== undefined) {
    if (data.humidity > 75) {
      if (worstStatus !== "CRITICAL") worstStatus = "WARNING";
      const alert = dbService.createAlert({
        node_id: nodeId,
        severity: "WARNING",
        type: "HUMIDITY",
        message: `High Condensation Risk: Humidity is ${data.humidity.toFixed(1)}% (Safe Max: 75%)`,
        value: data.humidity,
        threshold: 75,
      });
      alerts.push(alert);
    } else if (data.humidity < 20) {
      if (worstStatus !== "CRITICAL") worstStatus = "WARNING";
      const alert = dbService.createAlert({
        node_id: nodeId,
        severity: "WARNING",
        type: "HUMIDITY",
        message: `Electrostatic Discharge (ESD) Risk: Humidity dropped to ${data.humidity.toFixed(1)}% (Safe Min: 20%)`,
        value: data.humidity,
        threshold: 20,
      });
      alerts.push(alert);
    }
  }

  // 3. Power Distribution Unit (PDU) & Current Overload
  if (data.powerWatts !== undefined) {
    if (data.powerWatts >= 3800) {
      worstStatus = "CRITICAL";
      const alert = dbService.createAlert({
        node_id: nodeId,
        severity: "CRITICAL",
        type: "POWER",
        message: `PDU Main Overload Spike: Power draw at ${data.powerWatts.toFixed(0)}W exceeds breaker safety threshold (3800W)`,
        value: data.powerWatts,
        threshold: 3800,
      });
      alerts.push(alert);
    } else if (data.powerWatts >= 3200) {
      if (worstStatus !== "CRITICAL") worstStatus = "WARNING";
      const alert = dbService.createAlert({
        node_id: nodeId,
        severity: "WARNING",
        type: "POWER",
        message: `High Power Demand: Power draw elevated at ${data.powerWatts.toFixed(0)}W (Threshold: 3200W)`,
        value: data.powerWatts,
        threshold: 3200,
      });
      alerts.push(alert);
    }
  }

  // 4. Physical Intrusion & Security
  if (data.doorStatus === "UNAUTHORIZED_OPEN") {
    worstStatus = "CRITICAL";
    const alert = dbService.createAlert({
      node_id: nodeId,
      severity: "CRITICAL",
      type: "INTRUSION",
      message: `PHYSICAL SECURITY BREACH: Server room access door forced or opened without authorized badge scan!`,
      value: 1,
      threshold: 0,
    });
    alerts.push(alert);
  }

  // 5. Vibration / Seismic / Tamper
  if (data.vibration !== undefined && data.vibration > 7.0) {
    worstStatus = "CRITICAL";
    const alert = dbService.createAlert({
      node_id: nodeId,
      severity: "CRITICAL",
      type: "VIBRATION",
      message: `Severe Structural Vibration: ${data.vibration.toFixed(2)}g detected on storage disk chassis!`,
      value: data.vibration,
      threshold: 7.0,
    });
    alerts.push(alert);
  }

  // 6. Network Packet Loss
  if (data.packetLossPct !== undefined && data.packetLossPct > 20) {
    if (worstStatus !== "CRITICAL") worstStatus = "WARNING";
    const alert = dbService.createAlert({
      node_id: nodeId,
      severity: "WARNING",
      type: "NETWORK",
      message: `Network Degradation: Switch port reporting ${data.packetLossPct.toFixed(1)}% packet drop rate`,
      value: data.packetLossPct,
      threshold: 20,
    });
    alerts.push(alert);
  }

  return {
    nodeStatus: worstStatus,
    alerts,
  };
}
