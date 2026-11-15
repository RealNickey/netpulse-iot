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
} from "lucide-react";

interface DataCenterOverviewProps {
  nodes: NodeStatus[];
  onTriggerAnomaly?: (anomaly: string) => void;
}

export const DataCenterOverview: React.FC<DataCenterOverviewProps> = ({
  nodes,
}) => {
  const [selectedNode, setSelectedNode] = useState<NodeStatus | null>(null);

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
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            Server Room Sensor Nodes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            7 simulated edge nodes streaming telemetry over MQTT on port 1883
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2.5 py-1 font-mono text-xs text-muted-foreground">
            Nodes active: <span className="font-semibold text-foreground ml-1">{nodes.length}</span>
          </Badge>
        </div>
      </div>

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
              <CardHeader className="p-4 pb-2">
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

              <CardContent className="p-4 pt-2 space-y-3">
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
                        <span className="text-[10px] text-muted-foreground">
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
