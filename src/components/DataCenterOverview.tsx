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
  Activity,
  Code,
  Network,
  Gauge,
  Lock,
  Unlock,
  Layers,
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

/**
 * Visual Thermal Heat Bar with color-coded safety, warning, and critical zones
 */
function ThermalHeatBar({ temp, maxLimit = 42 }: { temp: number; maxLimit?: number }) {
  const min = 15;
  const max = 50;
  const pct = Math.min(100, Math.max(0, ((temp - min) / (max - min)) * 100));
  const isDanger = temp >= maxLimit;
  const isWarn = temp >= 35 && temp < maxLimit;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Thermometer className="h-3 w-3" /> Heat Range
        </span>
        <span
          className={`font-bold ${
            isDanger ? "text-destructive" : isWarn ? "text-amber-500" : "text-emerald-400"
          }`}
        >
          {temp.toFixed(1)}°C
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-secondary/80 overflow-hidden border border-border/40">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
          style={{
            width: `${pct}%`,
            background: isDanger
              ? "linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)"
              : isWarn
              ? "linear-gradient(90deg, #10b981 0%, #f59e0b 100%)"
              : "linear-gradient(90deg, #059669 0%, #10b981 100%)",
          }}
        />
        {/* Critical limit indicator tick */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive/80 z-10"
          style={{ left: `${((maxLimit - min) / (max - min)) * 100}%` }}
          title={`Critical Threshold: ${maxLimit}°C`}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
        <span>15°C</span>
        <span className="text-amber-500/80">Warn 35°C</span>
        <span className="text-destructive/80">Crit 42°C</span>
        <span>50°C</span>
      </div>
    </div>
  );
}

/**
 * Visual Electrical Power Draw Gauge Bar
 */
function PowerLoadGauge({ watts, maxWatts = 3800 }: { watts: number; maxWatts?: number }) {
  const pct = Math.min(100, Math.round((watts / 4200) * 100));
  const isOverload = watts >= maxWatts;
  const isHigh = watts >= 3200 && watts < maxWatts;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3 w-3" /> Power Draw
        </span>
        <span
          className={`font-bold ${
            isOverload ? "text-destructive" : isHigh ? "text-amber-500" : "text-foreground"
          }`}
        >
          {watts}W <span className="text-[10px] text-muted-foreground font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-secondary/80 overflow-hidden border border-border/40">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isOverload
              ? "bg-destructive animate-pulse"
              : isHigh
              ? "bg-amber-500"
              : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
          style={{ left: `${(maxWatts / 4200) * 100}%` }}
          title={`Breaker Trip: ${maxWatts}W`}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
        <span>0W</span>
        <span className="text-amber-500/80">3200W</span>
        <span className="text-destructive/80">Trip 3800W</span>
      </div>
    </div>
  );
}

/**
 * Miniature Chassis Faceplate Visual tailored to each server/hardware type
 */
function HardwareChassisVisual({
  type,
  data,
  status,
}: {
  type: string;
  data: any;
  status: string;
}) {
  const isCritical = status === "CRITICAL";
  const isWarning = status === "WARNING";

  if (type === "COMPUTE_RACK" || type === "STORAGE_RACK" || type === "AI_BLADE") {
    const bayCount = type === "STORAGE_RACK" ? 8 : type === "AI_BLADE" ? 6 : 4;
    const cpuLoad = data.cpuLoad || (type === "AI_BLADE" ? 68 : 35);

    return (
      <div className="p-2 rounded-md bg-secondary/50 border border-border/60 space-y-2">
        {/* Chassis Bezel Header */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 rounded text-[9px] bg-background border border-border/60 font-bold text-foreground">
              {type === "STORAGE_RACK" ? "4U SAN" : type === "AI_BLADE" ? "3U BLADE" : "2U SERVER"}
            </span>
            <span>BAY SLOTS</span>
          </div>
          {/* LED Array: PWR, NET, ALM */}
          <div className="flex items-center gap-1">
            <span title="Power" className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span title="Network Link" className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span
              title="Alarm"
              className={`h-1.5 w-1.5 rounded-full ${
                isCritical
                  ? "bg-destructive animate-ping"
                  : isWarning
                  ? "bg-amber-500"
                  : "bg-emerald-500/30"
              }`}
            />
          </div>
        </div>

        {/* Drive Bay Faceplate */}
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-1">
          {Array.from({ length: bayCount }).map((_, i) => (
            <div
              key={i}
              className="h-4 rounded-[2px] bg-background/80 border border-border/40 flex items-center justify-between px-1"
            >
              <div className="w-1.5 h-1 bg-border rounded-[1px]" />
              <div
                className={`h-1 w-1 rounded-full ${
                  isCritical
                    ? "bg-destructive animate-pulse"
                    : (i + Math.round(data.temperature || 0)) % 2 === 0
                    ? "bg-emerald-400"
                    : "bg-emerald-500/40"
                }`}
              />
            </div>
          ))}
        </div>

        {/* CPU Load Segmented Visual */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
            <span>CPU LOAD</span>
            <span className="font-bold text-foreground">{cpuLoad}%</span>
          </div>
          <div className="flex gap-0.5 h-1.5">
            {Array.from({ length: 16 }).map((_, idx) => {
              const lit = (idx / 16) * 100 <= cpuLoad;
              const isOver = idx >= 13;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-[1px] transition-colors ${
                    lit
                      ? isOver
                        ? "bg-destructive"
                        : "bg-primary"
                      : "bg-secondary"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (type === "NETWORK_SWITCH") {
    const loss = data.packetLossPct || 0;
    const isDegraded = loss > 15;

    return (
      <div className="p-2 rounded-md bg-secondary/50 border border-border/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 rounded text-[9px] bg-background border border-border/60 font-bold text-cyan-400">
              1U 10GbE FIBER
            </span>
            <span>8-PORT FABRIC</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </div>
        </div>

        {/* 8-Port Switch Mockup with Active Link LEDs */}
        <div className="grid grid-cols-8 gap-1 bg-background/90 p-1.5 rounded border border-border/40">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  isDegraded
                    ? i % 2 === 0
                      ? "bg-amber-500 animate-pulse"
                      : "bg-destructive"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
              <div className="w-full h-3 rounded-[2px] bg-secondary border border-border/60 flex items-center justify-center">
                <div className="w-1.5 h-1 bg-muted-foreground/30 rounded-[1px]" />
              </div>
            </div>
          ))}
        </div>

        {/* Drop Rate Bar */}
        <div className="flex items-center justify-between text-[9px] font-mono">
          <span className="text-muted-foreground">PACKET LOSS</span>
          <span className={`font-bold ${isDegraded ? "text-destructive" : "text-foreground"}`}>
            {loss.toFixed(1)}% {isDegraded ? "DEGRADED" : "NOMINAL"}
          </span>
        </div>
      </div>
    );
  }

  if (type === "PDU") {
    const currentAmps = data.currentAmps || 0;
    const voltage = data.voltage || 230;

    return (
      <div className="p-2 rounded-md bg-secondary/50 border border-border/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="px-1 py-0.5 rounded text-[9px] bg-background border border-border/60 font-bold text-amber-400">
            PDU MAIN FEED
          </span>
          <span className="text-[10px] font-mono text-foreground font-bold">
            {voltage}V AC • {currentAmps}A
          </span>
        </div>

        {/* Breaker Switch & Indicator Graphics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-1.5 rounded bg-background/90 border border-border/40 flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground">BREAKER A</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold text-emerald-500">CLOSED</span>
              <div className="w-2 h-4 rounded-[2px] bg-emerald-500" />
            </div>
          </div>
          <div className="p-1.5 rounded bg-background/90 border border-border/40 flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground">BREAKER B</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold text-emerald-500">CLOSED</span>
              <div className="w-2 h-4 rounded-[2px] bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "HVAC") {
    const isFailed = data.airflowCfm !== undefined && data.airflowCfm < 500;
    const fanRpm = data.fanSpeedRpm || 2400;

    return (
      <div className="p-2 rounded-md bg-secondary/50 border border-border/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="px-1 py-0.5 rounded text-[9px] bg-background border border-border/60 font-bold text-emerald-400">
            CHILLER FAN COIL
          </span>
          <span className="text-[10px] font-mono text-foreground font-bold">
            {fanRpm} RPM
          </span>
        </div>

        {/* Animated Chiller Cooling Fan Visual */}
        <div className="flex items-center justify-between p-2 rounded bg-background/90 border border-border/40">
          <div className="flex items-center gap-2">
            <Fan
              className={`h-5 w-5 ${
                isFailed
                  ? "text-destructive"
                  : "text-primary animate-spin"
              }`}
              style={{ animationDuration: isFailed ? "0s" : "1.2s" }}
            />
            <div>
              <div className="text-[10px] font-mono font-bold text-foreground">
                {isFailed ? "BLOWER FAULT" : "ACTIVE COOLING"}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                Flow: {data.airflowCfm || 1850} CFM
              </div>
            </div>
          </div>
          <div
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
              isFailed
                ? "bg-destructive/20 text-destructive border border-destructive/40"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}
          >
            {isFailed ? "STAGNANT" : "FLOW OK"}
          </div>
        </div>
      </div>
    );
  }

  if (type === "SECURITY") {
    const isOpen = data.doorStatus === "UNAUTHORIZED_OPEN";

    return (
      <div className="p-2 rounded-md bg-secondary/50 border border-border/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="px-1 py-0.5 rounded text-[9px] bg-background border border-border/60 font-bold text-blue-400">
            VAULT PERIMETER
          </span>
          <span className="text-[10px] font-mono text-foreground font-bold">
            RFID BIOMETRIC
          </span>
        </div>

        {/* Visual Door Portal Graphic */}
        <div
          className={`p-2 rounded border flex items-center justify-between transition-colors ${
            isOpen
              ? "bg-destructive/15 border-destructive/50 text-destructive animate-pulse"
              : "bg-background/90 border-border/40 text-emerald-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <Unlock className="h-5 w-5 text-destructive" />
            ) : (
              <Lock className="h-5 w-5 text-emerald-500" />
            )}
            <div>
              <div className="text-[10px] font-mono font-bold">
                {isOpen ? "DOOR BREACH DETECTED" : "VAULT DOOR SECURED"}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                {isOpen ? "Tamper loop disconnected" : "Magnetic latch engaged"}
              </div>
            </div>
          </div>
          <Badge
            variant={isOpen ? "destructive" : "outline"}
            className="text-[9px] font-mono"
          >
            {isOpen ? "ALARM" : "LOCKED"}
          </Badge>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Visual Data Center Floor Plan & Cold/Hot Aisle Map
 */
function DataCenterFloorPlan({
  nodes,
  onSelectNode,
}: {
  nodes: NodeStatus[];
  onSelectNode: (node: NodeStatus) => void;
}) {
  const getNode = (id: string) => nodes.find((n) => n.node_id === id);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "CRITICAL":
        return "bg-destructive text-destructive-foreground border-destructive animate-pulse";
      case "WARNING":
        return "bg-amber-500 text-black border-amber-600";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Data Center Room Layout &amp; Rack Elevation Map
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Hot/Cold containment aisle topology with real-time sensor node health
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Nominal
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Warning
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Critical
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 space-y-3">
          {/* Aisle Row A: Compute Racks */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
              <span>ROW A (COLD AISLE INTAKE)</span>
              <span className="text-cyan-400 flex items-center gap-1">
                <Wind className="h-3 w-3" /> Chilled Airflow
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {["rack-01", "rack-02", "rack-03"].map((id) => {
                const node = getNode(id);
                if (!node) return null;
                let data: any = {};
                try {
                  data = JSON.parse(node.last_telemetry || "{}").data || {};
                } catch (e) {}

                return (
                  <button
                    key={id}
                    onClick={() => onSelectNode(node)}
                    className="p-2.5 rounded-md bg-card border border-border/80 hover:border-primary/60 transition-colors text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-secondary">
                        <Server className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                          {node.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {node.node_id} • {data.temperature || 24}°C
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] font-mono ${getStatusColor(node.status)}`}>
                      {node.status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Central Distribution: Network & Power */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-muted-foreground px-1">
              ROW B (POWER &amp; FABRIC DISTRIBUTION)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["rack-04", "pdu-main"].map((id) => {
                const node = getNode(id);
                if (!node) return null;
                let data: any = {};
                try {
                  data = JSON.parse(node.last_telemetry || "{}").data || {};
                } catch (e) {}

                return (
                  <button
                    key={id}
                    onClick={() => onSelectNode(node)}
                    className="p-2.5 rounded-md bg-card border border-border/80 hover:border-primary/60 transition-colors text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-secondary">
                        {id === "rack-04" ? (
                          <Network className="h-3.5 w-3.5 text-cyan-400" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                          {node.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {id === "rack-04"
                            ? `${data.packetLossPct || 0}% drop`
                            : `${data.powerWatts || 2800}W draw`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] font-mono ${getStatusColor(node.status)}`}>
                      {node.status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Perimeter: HVAC & Security */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-muted-foreground px-1">
              FACILITY PERIMETER
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["hvac-01", "sec-entry"].map((id) => {
                const node = getNode(id);
                if (!node) return null;
                let data: any = {};
                try {
                  data = JSON.parse(node.last_telemetry || "{}").data || {};
                } catch (e) {}

                return (
                  <button
                    key={id}
                    onClick={() => onSelectNode(node)}
                    className="p-2.5 rounded-md bg-card border border-border/80 hover:border-primary/60 transition-colors text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-secondary">
                        {id === "hvac-01" ? (
                          <Wind className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Shield className="h-3.5 w-3.5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                          {node.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {id === "hvac-01"
                            ? `${data.airflowCfm || 1850} CFM`
                            : data.doorStatus === "UNAUTHORIZED_OPEN"
                            ? "DOOR OPEN"
                            : "DOOR SECURED"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] font-mono ${getStatusColor(node.status)}`}>
                      {node.status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
          <Badge
            variant="secondary"
            className="font-mono text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/30"
          >
            WARNING
          </Badge>
        );
      case "ONLINE":
      default:
        return (
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          >
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

      {/* Interactive Data Center Floor Plan & Aisle Map */}
      <DataCenterFloorPlan nodes={nodes} onSelectNode={(n) => setSelectedNode(n)} />

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

      {/* Grid of Visual Node Chassis Cards */}
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
          const temps =
            history && history.temps.length > 1
              ? history.temps
              : [data.temperature || 24, data.temperature || 24];
          const powers =
            history && history.powers.length > 1
              ? history.powers
              : [data.powerWatts || 500, data.powerWatts || 500];

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
              className={`transition-[border-color,box-shadow] duration-150 ease-out relative overflow-hidden border ${
                isCritical
                  ? "border-destructive/60 bg-destructive/5 shadow-md shadow-destructive/10"
                  : isWarning
                  ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                  : "border-border hover:border-primary/50 bg-card hover:shadow-xs"
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
                {/* Visual Hardware Chassis Mockup */}
                <HardwareChassisVisual type={node.type} data={data} status={node.status} />

                {/* Primary Environmental Visual Gauges */}
                <div className="space-y-2.5 pt-1">
                  {/* Visual Thermal Heat Bar */}
                  {data.temperature !== undefined && (
                    <ThermalHeatBar temp={data.temperature} maxLimit={42} />
                  )}

                  {/* Visual Power Load Gauge */}
                  {data.powerWatts !== undefined && (
                    <PowerLoadGauge watts={data.powerWatts} maxWatts={3800} />
                  )}
                </div>

                {/* Secondary Visual Metrics (Humidity, Vibration, Fan) */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  {/* Humidity Bar */}
                  {data.humidity !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3" /> Humidity
                        </span>
                        <span className="font-bold text-foreground">{data.humidity}%</span>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${Math.min(100, data.humidity)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Vibration Shock Bar */}
                  {data.vibration !== undefined && (
                    <div className="p-2 rounded-md bg-secondary/40 border border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Vibration
                        </span>
                        <span
                          className={`font-bold ${
                            data.vibration > 7.0 ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {data.vibration}g
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            data.vibration > 7.0 ? "bg-destructive animate-pulse" : "bg-purple-400"
                          }`}
                          style={{ width: `${Math.min(100, (data.vibration / 10) * 100)}%` }}
                        />
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
