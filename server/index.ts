import { mqttBroker } from "./mqttBroker";
import { simulator, AnomalyType } from "./simulator";
import { dbService } from "./db";
import type { ServerWebSocket } from "bun";
import path from "path";

const PORT = 3001;

// Keep track of active WebSocket client connections
const wsClients = new Set<ServerWebSocket<any>>();

// Start the Bun HTTP & WebSocket Server
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // 1. Upgrade WebSocket connection
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // CORS headers for local Vite dev
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // 2. REST Endpoints
    // GET /api/status
    if (url.pathname === "/api/status" && req.method === "GET") {
      const metrics = mqttBroker.getMetrics();
      const stats = dbService.getStats();
      const simStatus = simulator.getStatus();
      return Response.json(
        {
          status: "ONLINE",
          mqttPort: 1883,
          wsClients: wsClients.size,
          metrics,
          stats,
          simStatus,
        },
        { headers }
      );
    }

    // GET /api/nodes
    if (url.pathname === "/api/nodes" && req.method === "GET") {
      const nodes = dbService.getAllNodes();
      return Response.json(nodes, { headers });
    }

    // GET /api/events
    if (url.pathname === "/api/events" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") || 100);
      const events = dbService.getRecentEvents(limit);
      return Response.json(events, { headers });
    }

    // GET /api/alerts
    if (url.pathname === "/api/alerts" && req.method === "GET") {
      const unackOnly = url.searchParams.get("unack") === "1";
      const limit = Number(url.searchParams.get("limit") || 50);
      const alerts = dbService.getAlerts(limit, unackOnly);
      return Response.json(alerts, { headers });
    }

    // POST /api/alerts/:id/ack
    if (url.pathname.startsWith("/api/alerts/") && url.pathname.endsWith("/ack") && req.method === "POST") {
      const parts = url.pathname.split("/");
      const id = Number(parts[3]);
      if (id) {
        dbService.acknowledgeAlert(id);
        broadcastToClients({
          type: "ALERT_ACKNOWLEDGED",
          alertId: id,
        });
        return Response.json({ success: true, id }, { headers });
      }
      return new Response("Invalid ID", { status: 400, headers });
    }

    // POST /api/alerts/ack-all
    if (url.pathname === "/api/alerts/ack-all" && req.method === "POST") {
      dbService.acknowledgeAllAlerts();
      broadcastToClients({
        type: "ALL_ALERTS_ACKNOWLEDGED",
      });
      return Response.json({ success: true }, { headers });
    }

    // POST /api/simulation/anomaly
    if (url.pathname === "/api/simulation/anomaly" && req.method === "POST") {
      return req.json().then((body: { anomaly: AnomalyType }) => {
        const anomaly = body.anomaly || "NONE";
        simulator.setAnomaly(anomaly);
        if (anomaly === "NONE") {
          dbService.acknowledgeAllAlerts();
          broadcastToClients({
            type: "ALL_ALERTS_ACKNOWLEDGED",
          });
        }
        broadcastToClients({
          type: "SIMULATION_UPDATE",
          simStatus: simulator.getStatus(),
        });
        return Response.json({ success: true, activeAnomaly: anomaly }, { headers });
      });
    }

    // POST /api/simulation/config
    if (url.pathname === "/api/simulation/config" && req.method === "POST") {
      return req.json().then((body: { intervalMs?: number; qos?: 0 | 1 }) => {
        if (body.intervalMs) simulator.setPublishInterval(body.intervalMs);
        if (body.qos !== undefined) simulator.setQoS(body.qos);
        return Response.json({ success: true, simStatus: simulator.getStatus() }, { headers });
      });
    }

    // GET /api/export/csv
    if (url.pathname === "/api/export/csv" && req.method === "GET") {
      const events = dbService.getRecentEvents(500);
      let csv = "ID,Timestamp,NodeID,Topic,QoS,LatencyMs,PacketSize,Payload\n";
      for (const e of events) {
        const cleanPayload = e.payload.replace(/"/g, '""');
        csv += `${e.id},"${e.timestamp}","${e.node_id}","${e.topic}",${e.qos},${e.latency_ms},${e.packet_size},"${cleanPayload}"\n`;
      }
      return new Response(csv, {
        headers: {
          ...headers,
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="iot_event_log.csv"',
        },
      });
    }

    // POST /api/clear
    if (url.pathname === "/api/clear" && req.method === "POST") {
      dbService.clearHistory();
      broadcastToClients({ type: "HISTORY_CLEARED" });
      return Response.json({ success: true }, { headers });
    }

    // 3. Static File Serving (Vite production build in ./dist)
    const distPath = path.join(process.cwd(), "dist");
    const requestedPath = path.join(distPath, url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    const requestedFile = Bun.file(requestedPath);

    if (requestedFile.size > 0) {
      return new Response(requestedFile);
    }

    // Fallback to dist/index.html for client-side SPA routing
    const indexHtml = Bun.file(path.join(distPath, "index.html"));
    if (indexHtml.size > 0) {
      return new Response(indexHtml, { headers: { "Content-Type": "text/html" } });
    }

    return new Response("NetPulse IoT API Server - Online", { headers });
  },

  websocket: {
    open(ws) {
      wsClients.add(ws);
      console.log(`[WebSocket] Client connected. Total active: ${wsClients.size}`);

      // Send initial snapshot on connect
      ws.send(
        JSON.stringify({
          type: "INITIAL_STATE",
          nodes: dbService.getAllNodes(),
          alerts: dbService.getAlerts(30),
          stats: dbService.getStats(),
          metrics: mqttBroker.getMetrics(),
          simStatus: simulator.getStatus(),
        })
      );
    },
    message(ws, message) {
      try {
        const parsed = JSON.parse(String(message));
        if (parsed.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
        }
      } catch (e) {}
    },
    close(ws) {
      wsClients.delete(ws);
      console.log(`[WebSocket] Client disconnected. Total active: ${wsClients.size}`);
    },
  },
});

function broadcastToClients(data: any) {
  const jsonStr = JSON.stringify(data);
  for (const client of wsClients) {
    try {
      client.send(jsonStr);
    } catch (err) {
      wsClients.delete(client);
    }
  }
}

// Subscribe to MQTT broker messages and forward to WebSockets
mqttBroker.onMessage((msg) => {
  broadcastToClients({
    type: "TELEMETRY_PACKET",
    packet: {
      topic: msg.topic,
      payload: msg.payload,
      qos: msg.qos,
      packetSize: msg.packetSize,
      latencyMs: msg.latencyMs,
      nodeStatus: msg.nodeStatus,
      timestamp: Date.now(),
    },
    alerts: msg.alerts,
    stats: dbService.getStats(),
  });
});

// Broadcast 1-second network rate updates
setInterval(() => {
  if (wsClients.size > 0) {
    broadcastToClients({
      type: "METRICS_UPDATE",
      metrics: mqttBroker.getMetrics(),
      stats: dbService.getStats(),
      simStatus: simulator.getStatus(),
    });
  }
}, 1000);

// Initialize Backend
async function init() {
  console.log(`=======================================================`);
  console.log(`  NetPulse IoT Event Logging & Notification Backend    `);
  console.log(`=======================================================`);

  // 1. Start MQTT Broker on TCP 1883
  await mqttBroker.start(1883);

  // 2. Start Bun HTTP / WebSocket server on Port 3001
  console.log(`[HTTP & WS] Bun Server running at http://localhost:${PORT}`);
  console.log(`[WebSocket] Endpoint active at ws://localhost:${PORT}/ws`);

  // 3. Start IoT Simulator Nodes publishing over MQTT
  await simulator.start("mqtt://localhost:1883");
}

init().catch((err) => {
  console.error("Fatal initialization error:", err);
  process.exit(1);
});
