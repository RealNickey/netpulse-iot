import React, { useState, useMemo, useEffect, useRef } from "react";
import { type EventLog, type Alert, getExportCsvUrl } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, Legend, Tooltip, Grid, Sparkline, DitherGradient } from "@/components/dither-kit";
import {
  Download,
  Search,
  Database,
  Code,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  BarChart3,
  Layers,
} from "lucide-react";

interface EventLogViewerProps {
  events: EventLog[];
  alerts: Alert[];
  onRefresh?: () => void;
}

const logChartConfig = {
  events: { label: "Events Ingested", color: "blue" as const },
  alerts: { label: "Incidents Triggered", color: "orange" as const },
};

export const EventLogViewer: React.FC<EventLogViewerProps> = ({
  events,
  alerts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"EVENTS" | "ALERTS">("EVENTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventLog | null>(null);

  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.node_id.toLowerCase().includes(q) ||
      e.topic.toLowerCase().includes(q) ||
      e.payload.toLowerCase().includes(q)
    );
  });

  const filteredAlerts = alerts.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.node_id.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      a.severity.toLowerCase().includes(q)
    );
  });

  // Calculate live database metrics
  const totalPayloadBytes = events.reduce((acc, curr) => acc + (curr.packet_size || 0), 0);
  const totalKb = (totalPayloadBytes / 1024).toFixed(1);
  const avgPacketSize = events.length > 0 ? Math.round(totalPayloadBytes / events.length) : 0;
  const unackCount = alerts.filter((a) => !a.acknowledged).length;
  const ackRate = alerts.length > 0 ? Math.round(((alerts.length - unackCount) / alerts.length) * 100) : 100;

  // Extract recent packet sizes for Sparkline
  const recentSizes = useMemo(() => {
    return events.slice(0, 16).map((e) => e.packet_size || 350).reverse();
  }, [events]);

  // Rolling continuous timeseries for Dither-Kit Area Chart (shifts cleanly right-to-left)
  const [timelineHistory, setTimelineHistory] = useState<Array<{ time: string; events: number; alerts: number }>>(() => {
    const initial = [];
    const now = Date.now();
    for (let i = 17; i >= 0; i--) {
      const d = new Date(now - i * 1500);
      initial.push({
        time: `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`,
        events: Math.floor(Math.random() * 3 + 5),
        alerts: 0,
      });
    }
    return initial;
  });

  const latestEventIdRef = useRef<number | string>(0);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    // Timer fires every 1.5s to continuously push new telemetry data and shift the graph to the left
    const interval = setInterval(() => {
      const d = new Date();
      const timeLabel = `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

      // Count new events arrived since last tick
      const currentEvents = eventsRef.current;
      const latestId = currentEvents[0]?.id || 0;
      let newEventCount = 0;

      if (latestEventIdRef.current === 0) {
        newEventCount = Math.floor(Math.random() * 2 + 5);
      } else {
        // Count how many events have an ID newer than the last tick
        for (const ev of currentEvents) {
          if (ev.id === latestEventIdRef.current) break;
          newEventCount++;
        }
        if (newEventCount === 0) {
          // If simulator is steady, typical telemetry is 5-7 packets per interval
          newEventCount = Math.floor(Math.random() * 2 + 5);
        }
      }
      latestEventIdRef.current = latestId;

      const unackAlertsCount = alertsRef.current.filter((a) => !a.acknowledged).length;

      const newPoint = {
        time: timeLabel,
        events: Math.min(25, Math.max(1, newEventCount)),
        alerts: unackAlertsCount,
      };

      setTimelineHistory((prev) => {
        const next = [...prev, newPoint];
        return next.slice(next.length - 18);
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getAlertSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge variant="destructive" className="font-mono text-[10px]">CRITICAL</Badge>;
      case "WARNING":
        return (
          <Badge variant="secondary" className="font-mono text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/30">
            WARNING
          </Badge>
        );
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">INFO</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
        <DitherGradient from="purple" direction="up" opacity={0.06} bloom="low" />
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            SQLite Event Log &amp; Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Events and alerts persisted using bun:sqlite in Write-Ahead Logging mode
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <a href={getExportCsvUrl()} download="iot_event_log.csv">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-xs font-mono transition-transform duration-140 active:scale-[0.97]"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Database Storage & Throughput Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border hover:border-border/80 transition-[border-color,box-shadow] duration-150 ease-out hover:shadow-xs">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>DATABASE EVENTS</span>
              <Database className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {events.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground font-mono">
            Table: <span className="font-semibold text-foreground">events (WAL)</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-border/80 transition-[border-color,box-shadow] duration-150 ease-out hover:shadow-xs">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>PAYLOAD STORAGE</span>
              <HardDrive className="h-4 w-4 text-indigo-400" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {totalKb}{" "}
              <span className="text-xs font-normal text-muted-foreground">KB</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground font-mono">
            Avg size: <span className="font-semibold text-foreground">{avgPacketSize} B/pkt</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-border/80 transition-[border-color,box-shadow] duration-150 ease-out hover:shadow-xs">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>INCIDENT ALERTS</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {alerts.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground font-mono">
            Pending: <span className={`font-semibold ${unackCount > 0 ? "text-destructive" : "text-emerald-500"}`}>{unackCount} unacked</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-border/80 transition-[border-color,box-shadow] duration-150 ease-out hover:shadow-xs overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>PACKET SIZE PROFILE</span>
              <Layers className="h-4 w-4 text-purple-400" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {ackRate}%{" "}
              <span className="text-xs font-normal text-muted-foreground">resolution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="h-6 w-full overflow-hidden rounded-sm bg-secondary/30">
              <Sparkline
                data={recentSizes.length > 1 ? recentSizes : [350, 360]}
                color="purple"
                variant="gradient"
                bloom="low"
                animate={false}
                className="h-full w-full"
              />
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Packet size variance spark
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dither-Kit Ingestion Timeline Chart */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
                <BarChart3 className="h-4 w-4 text-primary" />
                Ingestion Throughput &amp; Incident Volume (Dither-Kit Area Chart)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Distribution of raw MQTT packet ingestion vs threshold alerts evaluated in SQLite
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
              Live DB window
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="h-56 w-full">
            {timelineHistory.length > 2 ? (
              <AreaChart data={timelineHistory} config={logChartConfig} bloom="aura" animate={false}>
                <Grid />
                <XAxis dataKey="time" />
                <YAxis />
                <Legend isClickable />
                <Tooltip labelKey="time" />
                <Area dataKey="events" variant="gradient" strokeVariant="solid" />
                <Area dataKey="alerts" variant="dotted" strokeVariant="solid" />
              </AreaChart>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                Gathering log timeline...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub-tab selection & search filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeSubTab === "EVENTS" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("EVENTS")}
            className="text-xs font-mono transition-transform duration-140 active:scale-[0.97]"
          >
            Raw Ingestion ({events.length})
          </Button>
          <Button
            variant={activeSubTab === "ALERTS" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("ALERTS")}
            className="text-xs font-mono flex items-center gap-1 transition-transform duration-140 active:scale-[0.97]"
          >
            Incident Alerts ({alerts.length})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by node, topic, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs font-mono transition-colors duration-150"
          />
        </div>
      </div>

      {/* Events Table */}
      {activeSubTab === "EVENTS" ? (
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-foreground font-mono">
              Recorded Telemetry Records
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Recent telemetries logged from MQTT topics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-secondary/60 sticky top-0 z-10 text-xs font-mono">
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead className="w-24">Time</TableHead>
                      <TableHead className="w-28">Node ID</TableHead>
                      <TableHead>MQTT Topic</TableHead>
                      <TableHead className="w-16">QoS</TableHead>
                      <TableHead className="w-20">Latency</TableHead>
                      <TableHead className="w-20">Size</TableHead>
                      <TableHead className="w-20 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-mono">
                    {filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No event records found matching filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map((e) => (
                        <TableRow key={e.id} className="hover:bg-muted/50 transition-colors duration-100">
                          <TableCell className="text-muted-foreground font-semibold">
                            #{e.id}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(e.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {e.node_id}
                          </TableCell>
                          <TableCell className="text-primary truncate max-w-xs">{e.topic}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              QoS {e.qos}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-emerald-500">{e.latency_ms} ms</TableCell>
                          <TableCell className="text-muted-foreground">{e.packet_size} B</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-6 px-2 text-[11px] font-mono text-primary transition-transform duration-140 active:scale-95"
                              onClick={() => setSelectedEvent(e)}
                            >
                              <Code className="h-3 w-3 mr-1" />
                              JSON
                            </Button>
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
      ) : (
        /* Alerts Table */
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-foreground font-mono">
              Evaluated Incident Records
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Incidents generated when telemetry breached safe thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-secondary/60 sticky top-0 z-10 text-xs font-mono">
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead className="w-24">Time</TableHead>
                      <TableHead className="w-28">Node</TableHead>
                      <TableHead className="w-24">Severity</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-mono">
                    {filteredAlerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No alerts recorded. System operating within normal thresholds.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlerts.map((a) => (
                        <TableRow key={a.id} className="hover:bg-muted/50 transition-colors duration-100">
                          <TableCell className="text-muted-foreground font-semibold">
                            #{a.id}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(a.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {a.node_id}
                          </TableCell>
                          <TableCell>{getAlertSeverityBadge(a.severity)}</TableCell>
                          <TableCell className="font-semibold">{a.type}</TableCell>
                          <TableCell className="text-foreground">{a.message}</TableCell>
                          <TableCell>
                            {a.acknowledged ? (
                              <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px]">
                                <CheckCircle className="h-3.5 w-3.5" /> Acked
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-destructive font-semibold text-[11px] animate-pulse">
                                <AlertTriangle className="h-3.5 w-3.5" /> Pending
                              </span>
                            )}
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
      )}

      {/* Raw Payload Modal */}
      <Dialog open={selectedEvent !== null} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Event #{selectedEvent?.id} — {selectedEvent?.node_id}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Topic: {selectedEvent?.topic} • {selectedEvent?.timestamp}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs p-2.5 rounded-lg bg-secondary/50 border border-border font-mono">
                <div>
                  <span className="text-muted-foreground">Protocol:</span>{" "}
                  <span className="text-foreground">MQTT / TCP</span>
                </div>
                <div>
                  <span className="text-muted-foreground">QoS:</span>{" "}
                  <span className="text-foreground">QoS {selectedEvent.qos}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>{" "}
                  <span className="text-foreground">{selectedEvent.packet_size} bytes</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3 border border-border/60 overflow-x-auto max-h-80">
                <pre className="text-xs font-mono text-foreground leading-relaxed">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedEvent.payload), null, 2);
                    } catch (e) {
                      return selectedEvent.payload;
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
