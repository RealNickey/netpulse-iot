import { useState, useEffect, useRef } from "react";
import {
  wsClient,
  fetchStatus,
  fetchNodes,
  fetchAlerts,
  fetchEvents,
  type NodeStatus,
  type Alert,
  type EventLog,
  type NetworkMetrics,
  type SimStatus,
} from "@/lib/api";
import { soundManager } from "@/lib/sound";
import { Header } from "@/components/Header";
import { ActiveAlertsBanner } from "@/components/ActiveAlertsBanner";
import { DataCenterOverview } from "@/components/DataCenterOverview";
import { NetworkMonitor, type LivePacket } from "@/components/NetworkMonitor";
import { EventLogViewer } from "@/components/EventLogViewer";
import { SimulatorControl } from "@/components/SimulatorControl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Server, Network, Database, Sliders } from "lucide-react";

export function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    totalPackets: 0,
    packetsPerSec: 0,
    totalBytes: 0,
    bytesPerSec: 0,
    connectedClients: 1,
    clientList: [],
    qos0Count: 0,
    qos1Count: 0,
    qos2Count: 0,
    avgLatencyMs: 0,
  });
  const [stats, setStats] = useState<any>({
    totalEvents: 0,
    totalAlerts: 0,
    unackAlerts: 0,
    avgLatency: 0,
  });
  const [simStatus, setSimStatus] = useState<SimStatus>({
    isRunning: true,
    activeAnomaly: "NONE",
    publishIntervalMs: 1500,
    qosLevel: 0,
    nodeCount: 7,
    nodes: [],
  });

  const [livePackets, setLivePackets] = useState<LivePacket[]>([]);
  const [nodeHistories, setNodeHistories] = useState<Record<string, { temps: number[]; powers: number[] }>>({});
  const [facilityHistory, setFacilityHistory] = useState<{ time: string; avgTemp: number; totalKw: number }[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  // Track rolling facility averages
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setInterval(() => {
      let tempSum = 0;
      let tempCount = 0;
      let powerSum = 0;
      for (const node of nodes) {
        try {
          const parsed = node.last_telemetry ? JSON.parse(node.last_telemetry) : {};
          if (parsed.data?.temperature !== undefined) {
            tempSum += parsed.data.temperature;
            tempCount++;
          }
          if (parsed.data?.powerWatts !== undefined) {
            powerSum += parsed.data.powerWatts;
          }
        } catch (e) {}
      }
      const avgTemp = tempCount > 0 ? Number((tempSum / tempCount).toFixed(1)) : 24.5;
      const totalKw = Number((powerSum / 1000).toFixed(2));
      const now = new Date();
      const time = `${now.getMinutes().toString().padStart(2, "0")}:${now
        .getSeconds()
        .toString()
        .padStart(2, "0")}`;

      setFacilityHistory((prev) => [...prev, { time, avgTemp, totalKw }].slice(-16));
    }, 2000);

    return () => clearInterval(timer);
  }, [nodes]);

  // Track acknowledged alerts locally for instant UI responsiveness
  const handleAlertAcked = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: 1 } : a))
    );
  };

  const loadAllData = async () => {
    try {
      const [statusRes, nodesRes, alertsRes, eventsRes] = await Promise.all([
        fetchStatus(),
        fetchNodes(),
        fetchAlerts(false),
        fetchEvents(100),
      ]);

      if (statusRes) {
        if (statusRes.metrics) setMetrics(statusRes.metrics);
        if (statusRes.stats) setStats(statusRes.stats);
        if (statusRes.simStatus) setSimStatus(statusRes.simStatus);
      }
      if (nodesRes) setNodes(nodesRes);
      if (alertsRes) setAlerts(alertsRes);
      if (eventsRes) setEvents(eventsRes);
    } catch (err) {
      // Backend might still be starting
    }
  };

  useEffect(() => {
    loadAllData();

    // WebSocket event listeners
    const unbindConn = wsClient.on("connection", (data) => {
      setWsConnected(data.connected);
    });

    const unbindInitial = wsClient.on("INITIAL_STATE", (data) => {
      setWsConnected(true);
      if (data.nodes) setNodes(data.nodes);
      if (data.alerts) setAlerts(data.alerts);
      if (data.stats) setStats(data.stats);
      if (data.metrics) setMetrics(data.metrics);
      if (data.simStatus) setSimStatus(data.simStatus);
    });

    const unbindMetrics = wsClient.on("METRICS_UPDATE", (data) => {
      if (data.metrics) setMetrics(data.metrics);
      if (data.stats) setStats(data.stats);
      if (data.simStatus) setSimStatus(data.simStatus);
    });

    const unbindSim = wsClient.on("SIMULATION_UPDATE", (data) => {
      if (data.simStatus) setSimStatus(data.simStatus);
    });

    const unbindAck = wsClient.on("ALERT_ACKNOWLEDGED", (data) => {
      handleAlertAcked(data.alertId);
    });

    const unbindTelemetry = wsClient.on("TELEMETRY_PACKET", (data) => {
      const packet = data.packet;

      // Update per-node history for sparklines
      const temp = packet.payload?.data?.temperature;
      const power = packet.payload?.data?.powerWatts;
      const nodeId = packet.payload?.nodeId;

      if (nodeId) {
        setNodeHistories((prev) => {
          const current = prev[nodeId] || { temps: [], powers: [] };
          const nextTemps = temp !== undefined ? [...current.temps, temp].slice(-14) : current.temps;
          const nextPowers = power !== undefined ? [...current.powers, power].slice(-14) : current.powers;
          return {
            ...prev,
            [nodeId]: { temps: nextTemps, powers: nextPowers },
          };
        });
      }

      // Update Node in state
      setNodes((prev) => {
        const found = prev.find((n) => n.node_id === packet.payload.nodeId);
        if (found) {
          return prev.map((n) =>
            n.node_id === packet.payload.nodeId
              ? {
                  ...n,
                  status: packet.nodeStatus,
                  packet_count: n.packet_count + 1,
                  last_telemetry: JSON.stringify(packet.payload),
                  last_seen: new Date().toISOString(),
                }
              : n
          );
        } else {
          return [
            ...prev,
            {
              node_id: packet.payload.nodeId,
              name: packet.payload.nodeName,
              type: packet.payload.nodeType,
              status: packet.nodeStatus,
              ip_address: packet.payload.ip,
              last_seen: new Date().toISOString(),
              packet_count: 1,
              last_telemetry: JSON.stringify(packet.payload),
            },
          ];
        }
      });

      // Update live packet stream (if not paused)
      if (!isPausedRef.current) {
        const newLivePacket: LivePacket = {
          id: `${packet.timestamp}_${Math.random()}`,
          timestamp: packet.timestamp,
          topic: packet.topic,
          nodeId: packet.payload.nodeId,
          qos: packet.qos,
          packetSize: packet.packetSize,
          latencyMs: packet.latencyMs,
          summary: JSON.stringify(packet.payload.data),
        };

        setLivePackets((prev) => [newLivePacket, ...prev.slice(0, 49)]);
      }

      // Add to events history
      const newEvent: EventLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        node_id: packet.payload.nodeId,
        topic: packet.topic,
        payload: JSON.stringify(packet.payload),
        qos: packet.qos,
        latency_ms: packet.latencyMs,
        packet_size: packet.packetSize,
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);

      // Check if new alerts arrived
      if (data.alerts && data.alerts.length > 0) {
        setAlerts((prev) => [...data.alerts, ...prev]);

        for (const alert of data.alerts) {
          if (alert.severity === "CRITICAL") {
            soundManager.playCritical();
            toast.error(alert.message, {
              description: `Node: ${alert.node_id} • Severity: CRITICAL`,
              duration: 6000,
            });
          } else if (alert.severity === "WARNING") {
            soundManager.playWarning();
            toast.warning(alert.message, {
              description: `Node: ${alert.node_id} • Severity: WARNING`,
              duration: 4000,
            });
          }
        }
      }
    });

    const unbindClear = wsClient.on("HISTORY_CLEARED", () => {
      setEvents([]);
      setAlerts([]);
      setLivePackets([]);
    });

    return () => {
      unbindConn();
      unbindInitial();
      unbindMetrics();
      unbindSim();
      unbindAck();
      unbindTelemetry();
      unbindClear();
    };
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
        {/* Navigation & Status Header */}
        <Header
          wsConnected={wsConnected}
          packetsPerSec={metrics.packetsPerSec}
          activeAnomaly={simStatus.activeAnomaly}
          totalAlerts={alerts.length}
          onClearHistory={() => {
            setEvents([]);
            setAlerts([]);
          }}
        />

        {/* Real-time Emergency Banner */}
        <ActiveAlertsBanner
          alerts={alerts}
          onAlertAcknowledged={handleAlertAcked}
        />

        {/* Main Dashboard Workspace */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
          <Tabs defaultValue="overview" className="w-full space-y-6">
            {/* Tab Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
              <TabsList className="bg-secondary/80 p-1 border border-border">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground transition-[background-color,color,transform] duration-140 ease-out cursor-pointer active:scale-[0.97]"
                >
                  <Server className="h-3.5 w-3.5 text-primary" />
                  <span>Infrastructure</span>
                </TabsTrigger>
                <TabsTrigger
                  value="network"
                  className="flex items-center gap-2 text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground transition-[background-color,color,transform] duration-140 ease-out cursor-pointer active:scale-[0.97]"
                >
                  <Network className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Network & Protocols</span>
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="flex items-center gap-2 text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground transition-[background-color,color,transform] duration-140 ease-out cursor-pointer active:scale-[0.97]"
                >
                  <Database className="h-3.5 w-3.5 text-amber-500" />
                  <span>Event Log & Audit</span>
                </TabsTrigger>
                <TabsTrigger
                  value="chaos"
                  className="flex items-center gap-2 text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground transition-[background-color,color,transform] duration-140 ease-out cursor-pointer active:scale-[0.97]"
                >
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span>Chaos Simulator</span>
                </TabsTrigger>
              </TabsList>

              <div className="text-xs font-mono text-muted-foreground hidden lg:block">
                SQLite WAL • MQTT TCP:1883 • WS:3001 • Bun Runtime
              </div>
            </div>

            {/* Tab 1: Infrastructure Overview */}
            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
              <DataCenterOverview
                nodes={nodes}
                nodeHistories={nodeHistories}
                facilityHistory={facilityHistory}
                onTriggerAnomaly={loadAllData}
              />
            </TabsContent>

            {/* Tab 2: Network & Protocol Telemetry */}
            <TabsContent value="network" className="mt-0 focus-visible:outline-none">
              <NetworkMonitor
                metrics={metrics}
                stats={stats}
                livePackets={livePackets}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
              />
            </TabsContent>

            {/* Tab 3: Persistent Event Log & Incidents */}
            <TabsContent value="logs" className="mt-0 focus-visible:outline-none">
              <EventLogViewer
                events={events}
                alerts={alerts}
                onRefresh={loadAllData}
              />
            </TabsContent>

            {/* Tab 4: Chaos Simulator Studio */}
            <TabsContent value="chaos" className="mt-0 focus-visible:outline-none">
              <SimulatorControl
                simStatus={simStatus}
                onConfigChange={loadAllData}
              />
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/60 py-4 px-6 text-center text-xs text-muted-foreground font-mono">
          NetPulse IoT Platform • Computer Networks Course Project • Built with Bun, React, SQLite & MQTT
        </footer>

        {/* Toast Notification Container */}
        <Toaster richColors position="bottom-right" closeButton />
      </div>
    </TooltipProvider>
  );
}

export default App;
