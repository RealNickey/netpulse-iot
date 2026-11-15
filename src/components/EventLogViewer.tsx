import React, { useState } from "react";
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
import {
  Download,
  Search,
  Database,
  Code,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface EventLogViewerProps {
  events: EventLog[];
  alerts: Alert[];
  onRefresh?: () => void;
}

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            SQLite Event Log &amp; Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Events and alerts persisted using bun:sqlite in WAL mode
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV Button */}
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
