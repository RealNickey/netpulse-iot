import React, { useState } from "react";
import { type SimStatus, triggerAnomaly, updateSimConfig } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Flame,
  Zap,
  ShieldAlert,
  Activity,
  Network,
  RotateCcw,
  Sliders,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface SimulatorControlProps {
  simStatus: SimStatus;
  onConfigChange: () => void;
}

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  simStatus,
  onConfigChange,
}) => {
  const [intervalVal, setIntervalVal] = useState<number>(simStatus.publishIntervalMs || 1500);
  const [activeQoS, setActiveQoS] = useState<0 | 1>((simStatus.qosLevel as 0 | 1) || 0);

  const handleTriggerAnomaly = async (type: string, label: string) => {
    await triggerAnomaly(type);
    toast.error(`Anomaly injected: ${label}`);
    onConfigChange();
  };

  const handleRestoreNormal = async () => {
    await triggerAnomaly("NONE");
    toast.success("Restored normal baseline conditions for all IoT nodes.");
    onConfigChange();
  };

  const handleIntervalCommit = async (val: number[]) => {
    const newInterval = val[0];
    setIntervalVal(newInterval);
    await updateSimConfig({ intervalMs: newInterval });
    toast.info(`Publish interval set to ${newInterval}ms`);
    onConfigChange();
  };

  const handleQosChange = async (qos: 0 | 1) => {
    setActiveQoS(qos);
    await updateSimConfig({ qos });
    toast.info(`MQTT Quality of Service updated to QoS ${qos}`);
    onConfigChange();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            Interactive IoT Anomaly & Chaos Injection Studio
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test real-time alert dispatching and network reaction under simulated failure conditions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {simStatus.activeAnomaly !== "NONE" ? (
            <Badge variant="destructive" className="animate-pulse">
              ACTIVE CHAOS: {simStatus.activeAnomaly}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              All Systems Nominal
            </Badge>
          )}
        </div>
      </div>

      {/* Network Traffic Tuners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Publish Rate Slider */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                IoT Broadcast Frequency
              </CardTitle>
              <span className="text-xs font-mono font-bold text-primary">
                {intervalVal} ms ({((1000 / intervalVal) * 7).toFixed(1)} pkts/s)
              </span>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Adjust how frequently simulated nodes publish telemetry packets over MQTT
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <Slider
              value={[intervalVal]}
              min={200}
              max={4000}
              step={100}
              onValueChange={(val) => setIntervalVal(val[0])}
              onValueCommit={handleIntervalCommit}
              className="py-2"
            />
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>High Traffic (200ms)</span>
              <span>Default (1500ms)</span>
              <span>Low Traffic (4000ms)</span>
            </div>
          </CardContent>
        </Card>

        {/* QoS Selector */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              MQTT Quality of Service (QoS) Level
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Demonstrates packet delivery guarantees and transport overhead
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={activeQoS === 0 ? "default" : "outline"}
                className="h-auto py-2.5 flex flex-col items-start text-left"
                onClick={() => handleQosChange(0)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">QoS 0</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Fire & Forget
                  </Badge>
                </div>
                <span className="text-[10px] opacity-80 mt-1">
                  At most once. Lowest latency, no confirmation packet.
                </span>
              </Button>

              <Button
                variant={activeQoS === 1 ? "default" : "outline"}
                className="h-auto py-2.5 flex flex-col items-start text-left"
                onClick={() => handleQosChange(1)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">QoS 1</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Guaranteed
                  </Badge>
                </div>
                <span className="text-[10px] opacity-80 mt-1">
                  At least once. Requires PUBACK acknowledgement handshake.
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Scenarios Palette */}
      <Card className="bg-card border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            1-Click Incident & Chaos Injection Scenarios
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Trigger simulated environmental and network anomalies to observe real-time platform alerting
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. HVAC Failure */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-destructive" />
                  <span className="font-bold text-xs text-foreground">
                    HVAC Precision Chiller Failure
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulates compressor failure. Chiller halts, causing rapid thermal runaway across
                  all compute & AI racks above 45°C.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs"
                onClick={() => handleTriggerAnomaly("HVAC_FAILURE", "HVAC Chiller Failure")}
              >
                Inject Thermal Runaway
              </Button>
            </div>

            {/* 2. PDU Surge */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-xs text-foreground">
                    PDU Main Power Overload Surge
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulates voltage spike and breaker load overload exceeding 4200W, threatening data
                  center phase imbalance.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                onClick={() => handleTriggerAnomaly("PDU_SURGE", "PDU Power Overload Surge")}
              >
                Inject Power Surge
              </Button>
            </div>

            {/* 3. Physical Security Breach */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span className="font-bold text-xs text-foreground">
                    Server Vault Intrusion Breach
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulates unauthorized physical door breach without RFID badge verification,
                  triggering security alarm.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs"
                onClick={() =>
                  handleTriggerAnomaly("SECURITY_BREACH", "Server Vault Intrusion Breach")
                }
              >
                Inject Security Breach
              </Button>
            </div>

            {/* 4. Seismic / Vibration */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <span className="font-bold text-xs text-foreground">
                    Storage Chassis Vibration
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulates abnormal mechanical vibration &gt; 8.0g on disk array chassis (fan
                  wobble or physical rack tampering).
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-purple-400/40 text-purple-400 hover:bg-purple-400/10"
                onClick={() =>
                  handleTriggerAnomaly("SEISMIC_SHAKE", "Storage Chassis High Vibration")
                }
              >
                Inject Vibration Spike
              </Button>
            </div>

            {/* 5. Network Congestion */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-xs text-foreground">
                    Switch Port Packet Drops
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulates link degradation on core switch, causing 35% packet drops and buffer
                  exhaustion.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
                onClick={() =>
                  handleTriggerAnomaly("NETWORK_CONGESTION", "Core Switch Packet Loss")
                }
              >
                Inject 35% Packet Loss
              </Button>
            </div>

            {/* 6. Restore Normal */}
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-xs text-foreground">
                    Restore Normal Baseline
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Clears all active chaos flags. Cools server room back to 22-26°C and restores nominal
                  power and network parameters.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleRestoreNormal}
              >
                Restore Safe Conditions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
