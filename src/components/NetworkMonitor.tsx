import React, { useState } from "react";
import type { NetworkMetrics } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Radio,
  Activity,
  Layers,
  Clock,
  ArrowDownUp,
  Pause,
  Play,
  FileText,
  Network,
} from "lucide-react";

export interface LivePacket {
  id: string;
  timestamp: number;
  topic: string;
  nodeId: string;
  qos: number;
  packetSize: number;
  latencyMs: number;
  summary: string;
}

interface NetworkMonitorProps {
  metrics: NetworkMetrics;
  stats: any;
  livePackets: LivePacket[];
  isPaused: boolean;
  onTogglePause: () => void;
}

export const NetworkMonitor: React.FC<NetworkMonitorProps> = ({
  metrics,
  stats,
  livePackets,
  isPaused,
  onTogglePause,
}) => {
  const [showTheory, setShowTheory] = useState(false);

  const kbPerSec = (metrics.bytesPerSec / 1024).toFixed(2);
  const totalMb = (metrics.totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Network Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Computer Networks & Transport Protocol Telemetry
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time inspection of MQTT over TCP (Port 1883) & WebSocket Duplex Frames (Port 3001)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTheory(!showTheory)}
            className="flex items-center gap-1.5 text-xs font-mono"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            {showTheory ? "Hide CN Defense Notes" : "View CN Viva Defense Notes"}
          </Button>
        </div>
      </div>

      {/* CN Defense / Theory Card */}
      {showTheory && (
        <Card className="border-primary/40 bg-primary/5 animate-in fade-in duration-300">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Computer Networks Concepts & Viva Defense Guide
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Key networking principles implemented and demonstrable in this platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-xs space-y-3 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-card/80 border border-border">
                <span className="font-bold text-foreground block mb-1">1. MQTT vs HTTP (Overhead):</span>
                MQTT fixed header is only <span className="font-mono text-primary font-bold">2 bytes</span> vs HTTP's 500-1000 byte headers. This minimizes IoT bandwidth and battery consumption on constrained links.
              </div>
              <div className="grid-cols-1 p-2.5 rounded-lg bg-card/80 border border-border">
                <span className="font-bold text-foreground block mb-1">2. Transport Layer (TCP):</span>
                MQTT runs directly on <span className="font-mono text-primary font-bold">TCP port 1883</span>, utilizing TCP's 3-way handshake (SYN, SYN-ACK, ACK), flow control, and sliding window retransmissions.
              </div>
              <div className="p-2.5 rounded-lg bg-card/80 border border-border">
                <span className="font-bold text-foreground block mb-1">3. Quality of Service (QoS):</span>
                <span className="font-mono text-primary font-bold">QoS 0</span> (At Most Once, fire-and-forget) vs <span className="font-mono text-primary font-bold">QoS 1</span> (At Least Once with PUBACK handshake verification).
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-card/80 border border-border">
              <span className="font-bold text-foreground block mb-1">4. Real-time Presentation Layer (WebSockets):</span>
              Rather than client HTTP polling (which introduces repeated TCP connection overhead), the Bun server maintains a single long-lived full-duplex WebSocket connection on port 3001 to stream sensor telemetry to the React dashboard instantly.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Packet Throughput */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>PACKET RATE</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {metrics.packetsPerSec}{" "}
              <span className="text-xs font-normal text-muted-foreground">pkts/sec</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Total Transmitted: <span className="font-mono font-semibold text-foreground">{metrics.totalPackets}</span>
          </CardContent>
        </Card>

        {/* Bandwidth Throughput */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>BANDWIDTH THROUGHPUT</span>
              <ArrowDownUp className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {kbPerSec}{" "}
              <span className="text-xs font-normal text-muted-foreground">KB/s</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Cumulative Data: <span className="font-mono font-semibold text-foreground">{totalMb} MB</span>
          </CardContent>
        </Card>

        {/* Transport Latency */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>AVG TRANSPORT LATENCY</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {metrics.avgLatencyMs || stats.avgLatency || 1.8}{" "}
              <span className="text-xs font-normal text-muted-foreground">ms</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Socket Roundtrip: <span className="font-mono text-emerald-500 font-semibold">Sub-5ms (Localhost)</span>
          </CardContent>
        </Card>

        {/* Connected Clients */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>ACTIVE MQTT TCP SOCKETS</span>
              <Radio className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {metrics.connectedClients}{" "}
              <span className="text-xs font-normal text-muted-foreground">clients</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Broker Port: <span className="font-mono font-semibold text-foreground">TCP 1883</span>
          </CardContent>
        </Card>
      </div>

      {/* QoS Distribution & Protocol Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* QoS Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-foreground">
              Quality of Service (QoS) Distribution
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Packet delivery guarantee breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-mono">QoS 0 (At Most Once - Fire & Forget)</span>
                <span className="font-mono font-bold text-foreground">{metrics.qos0Count} pkts</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics.totalPackets > 0
                        ? (metrics.qos0Count / metrics.totalPackets) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-mono">QoS 1 (At Least Once - PUBACK handshake)</span>
                <span className="font-mono font-bold text-foreground">{metrics.qos1Count} pkts</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics.totalPackets > 0
                        ? (metrics.qos1Count / metrics.totalPackets) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Protocol Stack Visualization */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-foreground">
              OSI & TCP/IP Layer Mapping
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              How packets traverse the networking stack in this project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
                <div className="font-bold text-primary">Application</div>
                <div className="text-[10px] text-muted-foreground mt-1">MQTT 3.1.1 / WS</div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="font-bold text-emerald-500">Transport</div>
                <div className="text-[10px] text-muted-foreground mt-1">TCP (1883 / 3001)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="font-bold text-amber-500">Network / IP</div>
                <div className="text-[10px] text-muted-foreground mt-1">IPv4 / Loopback</div>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <div className="font-bold text-indigo-400">Data Link</div>
                <div className="text-[10px] text-muted-foreground mt-1">Ethernet Framing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Packet Stream (Mini-Wireshark Inspector) */}
      <Card className="bg-card border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                Live MQTT Packet Sniffer & Stream Inspector
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Streaming live ingress packets captured by the Aedes MQTT broker
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onTogglePause}
                className="h-8 text-xs font-mono flex items-center gap-1.5"
              >
                {isPaused ? (
                  <>
                    <Play className="h-3.5 w-3.5 text-emerald-500" /> Resume Stream
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5 text-amber-500" /> Pause Stream
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="rounded-lg border border-border/80 overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader className="bg-secondary/60 sticky top-0 z-10 text-xs font-mono">
                  <TableRow>
                    <TableHead className="w-24">Time</TableHead>
                    <TableHead>MQTT Topic</TableHead>
                    <TableHead className="w-24">Node</TableHead>
                    <TableHead className="w-16">QoS</TableHead>
                    <TableHead className="w-20">Size</TableHead>
                    <TableHead className="w-20">Latency</TableHead>
                    <TableHead>Payload Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-mono">
                  {livePackets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        Waiting for incoming MQTT packets...
                      </TableCell>
                    </TableRow>
                  ) : (
                    livePackets.map((pkt) => (
                      <TableRow key={pkt.id} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(pkt.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {pkt.topic}
                        </TableCell>
                        <TableCell>{pkt.nodeId}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            QoS {pkt.qos}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{pkt.packetSize} B</TableCell>
                        <TableCell className="text-emerald-500">{pkt.latencyMs} ms</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {pkt.summary}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
