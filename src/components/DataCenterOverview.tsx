import React, { useState } from "react";
import type { NodeStatus } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, Legend, Tooltip, Grid, Sparkline, DitherGradient } from "@/components/dither-kit";
import {
  Server,
  Thermometer,
  Zap,
  Droplets,
  HardDrive,
  Cpu,
  Fan,
  Wind,
  Shield,
  ShieldAlert,
  Activity,
  Code,
  Network,
  Gauge,
} from "lucide-react";

interface DataCenterOverviewProps {
  nodes: NodeStatus[];
  nodeHistories?: Record<string, { temps: number[]; powers: number[] }>;
  facilityHistory?: { time: string; avgTemp: number; totalKw: number }[];
  onTriggerAnomaly?: (anomaly: string) => void;
}

const facilityConfig = {
  avgTemp: { label: "Average Temp (°C)", color: "orange" as const },
  totalKw: { label: "Total Power (kW)", color: "purple" as const },
};

export const DataCenterOverview: React.FC<DataCenterOverviewProps> = ({
  nodes,
  nodeHistories = {},
  facilityHistory = [],
}) => {
  const [selectedNode, setSelectedNode] = useState<NodeStatus | null>(null);

  // Compute live facility totals
  let maxTemp = 0;
  let totalWatts = 0;
  let criticalCount = 0;
  let warningCount = 0;

  for (const n of nodes) {
    if (n.status === "CRITICAL") criticalCount++;
    if (n.status === "WARNING") warningCount++;
    try {
      const parsed = n.last_telemetry ? JSON.parse(n.last_telemetry) : {};
      if (parsed.data?.temperature && parsed.data.temperature > maxTemp) {
        maxTemp = parsed.data.temperature;
      }
      if (parsed.data?.powerWatts) {
        totalWatts += parsed.data.powerWatts;
      }
    } catch (e) {}
  }

  const totalKw = (totalWatts / 1000).toFixed(2);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "COMPUTE_RACK":
        return <Cpu className="h-4.5 w-4.5 text-primary" />;
      case "STORAGE_RACK":
        return <HardDrive className="h-4.5 w-4.5 text-indigo-400" />;
      case "AI_BLADE":
        return <Server className="h-4.5 w-4.5 text-purple-400" />;
      case "NETWORK_SWITCH":
        return <Network className="h-4.5 w-4.5 text-cyan-400" />;
      case "PDU":
        return <Zap className="h-4.5 w-4.5 text-amber-400" />;
      case "HVAC":
        return <Wind className="h-4.5 w-4.5 text-emerald-400" />;
      case "SECURITY":
        return <Shield className="h-4.5 w-4.5 text-blue-400" />;
      default:
        return <Server className="h-4.5 w-4.5 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRITICAL":
        return (
          <Badge variant="destructive" className="font-mono text-[10px] animate-pulse">
            CRITICAL
          </Badge>
        );
      case "WARNING":
        return (
          <Badge variant="secondary" className="font-mono text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/30">
            WARNING
          </Badge>
        );
      case "ONLINE":
      default:
        return (
          <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
            NORMAL
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner with live aggregate readings */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            Server Room Sensor Nodes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            7 simulated edge nodes streaming telemetry over MQTT on port 1883
          </p>
        </div>

        {/* Live Aggregate Stat Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-md bg-secondary/80 border border-border">
            <span className="text-muted-foreground">Facility Load:</span>{" "}
            <span className="font-bold text-foreground">{totalKw} kW</span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-secondary/80 border border-border">
            <span className="text-muted-foreground">Max Temp:</span>{" "}
            <span
              className={`font-bold ${
                maxTemp >= 40
                  ? "text-destructive"
                  : maxTemp >= 35
                  ? "text-amber-500"
                  : "text-foreground"
              }`}
            >
              {maxTemp > 0 ? `${maxTemp.toFixed(1)}°C` : "24.5°C"}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-secondary/80 border border-border">
            <span className="text-muted-foreground">Alert status:</span>{" "}
            {criticalCount > 0 ? (
              <span className="text-destructive font-bold">{criticalCount} Critical</span>
            ) : warningCount > 0 ? (
              <span className="text-amber-500 font-bold">{warningCount} Warning</span>
            ) : (
              <span className="text-emerald-500 font-bold">All 7 Nominal</span>
            )}
          </div>
        </div>
      </div>

      {/* Facility Thermal & Power Load Aggregate (Dither-Kit Area Chart) */}
      {facilityHistory.length > 2 && (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
                  <Gauge className="h-4 w-4 text-primary" />
                  Facility Thermal Load &amp; Power History (Dither-Kit Area Chart)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Mean server room temperature and cumulative facility electrical draw over time
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                Multi-series dither
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-56 w-full">
              <AreaChart data={facilityHistory} config={facilityConfig} bloom="aura" animate={false}>
                <Grid />
                <XAxis dataKey="time" />
                <YAxis />
                <Legend isClickable />
                <Tooltip labelKey="time" />
                <Area dataKey="avgTemp" variant="gradient" strokeVariant="solid" />
                <Area dataKey="totalKw" variant="dotted" strokeVariant="solid" />
              </AreaChart>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid of Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {nodes.map((node) => {
          let telemetry: any = {};
          try {
            telemetry = node.last_telemetry ? JSON.parse(node.last_telemetry) : {};
          } catch (e) {}

          const data = telemetry.data || {};
          const isCritical = node.status === "CRITICAL";
          const isWarning = node.status === "WARNING";

          // Per-node history for sparkline
          const history = nodeHistories[node.node_id];
          const temps = history && history.temps.length > 1 ? history.temps : [data.temperature || 24, data.temperature || 24];
          const powers = history && history.powers.length > 1 ? history.powers : [data.powerWatts || 500, data.powerWatts || 500];

          // Determine sparkline color
          const sparkColor =
            data.temperature >= 40
              ? ("red" as const)
              : data.temperature >= 35
              ? ("orange" as const)
              : ("blue" as const);

          return (
            <Card
              key={node.node_id}
              className={`transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 relative overflow-hidden border ${
                isCritical
                  ? "border-destructive/60 bg-destructive/5 shadow-md shadow-destructive/10"
                  : isWarning
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border hover:border-border/80 bg-card hover:shadow-xs"
              }`}
            >
              {/* DitherGradient wash for fault alert state */}
              {isCritical && (
                <DitherGradient from="red" direction="up" opacity={0.12} bloom="low" />
              )}
              {isWarning && (
                <DitherGradient from="orange" direction="up" opacity={0.08} bloom="low" />
              )}

              <CardHeader className="p-4 pb-2 relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-secondary/80 border border-border/50">
                      {getNodeIcon(node.type)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold tracking-tight text-foreground line-clamp-1">
                        {node.name}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-muted-foreground">
                        {node.node_id} • {node.ip_address}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(node.status)}
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3 relative z-10">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Temperature */}
                  {data.temperature !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Thermometer className="h-3 w-3" /> Temp
                        </span>
                        <span className="text-[10px] text-muted-foreground">Limit 42°C</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span
                          className={`text-base font-bold font-mono ${
                            data.temperature >= 40
                              ? "text-destructive"
                              : data.temperature >= 35
                              ? "text-amber-500"
                              : "text-foreground"
                          }`}
                        >
                          {data.temperature}°C
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {data.temperature >= 40 ? "Overheat" : "Nominal"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Power */}
                  {data.powerWatts !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Zap className="h-3 w-3" /> Power
                        </span>
                        <span className="text-[10px] text-muted-foreground">{data.currentAmps || 0}A</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span
                          className={`text-base font-bold font-mono ${
                            data.powerWatts >= 3800
                              ? "text-destructive"
                              : data.powerWatts >= 3200
                              ? "text-amber-500"
                              : "text-foreground"
                          }`}
                        >
                          {data.powerWatts}W
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {data.voltage || 230}V
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Humidity */}
                  {data.humidity !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Droplets className="h-3 w-3" /> Humidity
                        </span>
                        <span className="text-[10px] text-muted-foreground">40-60%</span>
                      </div>
                      <span className="text-base font-bold font-mono text-foreground">
                        {data.humidity}%
                      </span>
                    </div>
                  )}

                  {/* Fan Speed */}
                  {data.fanSpeedRpm !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Fan className="h-3 w-3" /> Fan
                        </span>
                        <span className="text-[10px] text-muted-foreground">RPM</span>
                      </div>
                      <span className="text-base font-bold font-mono text-foreground">
                        {data.fanSpeedRpm}
                      </span>
                    </div>
                  )}

                  {/* Vibration */}
                  {data.vibration !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Activity className="h-3 w-3" /> Vibration
                        </span>
                        <span className="text-[10px] text-muted-foreground">g</span>
                      </div>
                      <span
                        className={`text-base font-bold font-mono ${
                          data.vibration > 7.0 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {data.vibration}g
                      </span>
                    </div>
                  )}

                  {/* Network Drop Rate */}
                  {data.packetLossPct !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Network className="h-3 w-3" /> Drop Rate
                        </span>
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>
                      <span
                        className={`text-base font-bold font-mono ${
                          data.packetLossPct > 15 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {data.packetLossPct}%
                      </span>
                    </div>
                  )}

                  {/* Airflow */}
                  {data.airflowCfm !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Wind className="h-3 w-3" /> Airflow
                        </span>
                        <span className="text-[10px] text-muted-foreground">CFM</span>
                      </div>
                      <span
                        className={`text-base font-bold font-mono ${
                          data.airflowCfm < 500 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {data.airflowCfm}
                      </span>
                    </div>
                  )}

                  {/* Door Status */}
                  {data.doorStatus !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40 col-span-2">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Shield className="h-3 w-3" /> Door Sensor
                        </span>
                        <span className="text-[10px] text-muted-foreground">Reed switch</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold font-mono ${
                            data.doorStatus === "UNAUTHORIZED_OPEN"
                              ? "text-destructive flex items-center gap-1"
                              : "text-emerald-500"
                          }`}
                        >
                          {data.doorStatus === "UNAUTHORIZED_OPEN" && (
                            <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
                          )}
                          {data.doorStatus === "UNAUTHORIZED_OPEN"
                            ? "Unauthorized open"
                            : "Secured / Closed"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Dither-Kit Sparkline for each node */}
                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                    <span>
                      {node.type === "PDU"
                        ? "Power draw spark"
                        : "Thermal trend spark"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {node.type === "PDU" ? `${data.powerWatts || 0}W` : `${data.temperature || 0}°C`}
                    </span>
                  </div>
                  <div className="h-8 w-full overflow-hidden rounded-sm bg-secondary/30">
                    <Sparkline
                      data={node.type === "PDU" ? powers : temps}
                      color={node.type === "PDU" ? "purple" : sparkColor}
                      variant="gradient"
                      bloom="low"
                      animate={false}
                      className="h-full w-full"
                    />
                  </div>
                </div>

                {/* Footer info & payload button */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Packets: <span className="font-semibold text-foreground">{node.packet_count}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-6 px-2 text-xs font-mono text-primary transition-transform duration-140 active:scale-95"
                    onClick={() => setSelectedNode(node)}
                  >
                    <Code className="h-3 w-3 mr-1" />
                    Payload
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Raw Payload Modal */}
      <Dialog open={selectedNode !== null} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Latest telemetry: {selectedNode?.node_id}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Packet received over MQTT from {selectedNode?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-secondary/50 border border-border font-mono">
                <div>
                  <span className="text-muted-foreground">IP:</span>{" "}
                  <span className="text-foreground">{selectedNode.ip_address}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Packets:</span>{" "}
                  <span className="text-foreground">{selectedNode.packet_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <span className="text-foreground">{selectedNode.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="text-foreground font-bold">{selectedNode.status}</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3 border border-border/60 overflow-x-auto max-h-80">
                <pre className="text-xs font-mono text-foreground leading-relaxed">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedNode.last_telemetry || "{}"), null, 2);
                    } catch (e) {
                      return selectedNode.last_telemetry || "No telemetry logged";
                    }
                  })()}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
