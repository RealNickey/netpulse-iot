import React, { useState } from "react";
import { type SimStatus, triggerAnomaly, updateSimConfig, acknowledgeAllAlerts } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AreaChart, Area, XAxis, YAxis, Legend, Tooltip, Grid, DitherGradient } from "@/components/dither-kit";
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
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";

interface SimulatorControlProps {
  simStatus: SimStatus;
  onConfigChange: () => void;
}

const simChartConfig = {
  temp: { label: "Node Temp (°C)", color: "orange" as const },
  powerHw: { label: "Power Draw (x100W)", color: "purple" as const },
};

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  simStatus,
  onConfigChange,
}) => {
  const [intervalVal, setIntervalVal] = useState<number>(simStatus.publishIntervalMs || 1500);
  const [activeQoS, setActiveQoS] = useState<0 | 1>((simStatus.qosLevel as 0 | 1) || 0);

  const handleTriggerAnomaly = async (type: string, label: string) => {
    await triggerAnomaly(type);
    toast.error(`Fault injected: ${label}`);
    onConfigChange();
  };

  const handleRestoreNormal = async () => {
    await triggerAnomaly("NONE");
    await acknowledgeAllAlerts();
    toast.success("Restored normal baseline conditions and dismissed all active alerts");
    onConfigChange();
  };

  const handleIntervalCommit = async (val: number[]) => {
    const newInterval = val[0];
    setIntervalVal(newInterval);
    await updateSimConfig({ intervalMs: newInterval });
    toast.info(`Interval set to ${newInterval}ms`);
    onConfigChange();
  };

  const handleQosChange = async (qos: 0 | 1) => {
    setActiveQoS(qos);
    await updateSimConfig({ qos });
    toast.info(`Updated to QoS ${qos}`);
    onConfigChange();
  };

  // Node profile data for live Dither-Kit chart
  const nodeProfileData = (simStatus.nodes || []).map((n) => ({
    node: n.id,
    temp: n.temp,
    powerHw: Number((n.power / 100).toFixed(1)),
  }));

  const isFaultActive = simStatus.activeAnomaly !== "NONE";

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
        {isFaultActive && (
          <DitherGradient from="red" direction="up" opacity={0.10} bloom="low" />
        )}
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            Hardware &amp; Network Fault Injection
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test real-time alert delivery and subscriber load under simulated failure conditions
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {isFaultActive ? (
            <Badge variant="destructive" className="font-mono text-xs animate-pulse">
              ACTIVE FAULT: {simStatus.activeAnomaly}
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              Normal
            </Badge>
          )}
        </div>
      </div>

      {/* Live Node Deviation Profile (Dither-Kit Area Chart) */}
      {nodeProfileData.length > 2 && (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Live Node Load &amp; Thermal Profile (Dither-Kit Area Chart)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Per-node temperature and power profiles across all 7 monitored entities
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                Live simulation state
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-56 w-full">
              <AreaChart data={nodeProfileData} config={simChartConfig} bloom="aura" animate={false}>
                <Grid />
                <XAxis dataKey="node" />
                <YAxis />
                <Legend isClickable />
                <Tooltip labelKey="node" />
                <Area dataKey="temp" variant="gradient" strokeVariant="solid" />
                <Area dataKey="powerHw" variant="dotted" strokeVariant="solid" />
              </AreaChart>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sliders & Protocol Tuning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Publish Rate Slider */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Publish Frequency
              </CardTitle>
              <span className="text-xs font-mono font-bold text-primary">
                {intervalVal} ms ({((1000 / intervalVal) * 7).toFixed(1)} pkts/s)
              </span>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Adjust how often simulated nodes send MQTT packets
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
              <span>Fast (200ms)</span>
              <span>Default (1500ms)</span>
              <span>Slow (4000ms)</span>
            </div>
          </CardContent>
        </Card>

        {/* QoS Selector */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              MQTT Quality of Service
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Delivery guarantee vs transport overhead
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={activeQoS === 0 ? "default" : "outline"}
                className="h-auto py-2.5 flex flex-col items-start text-left transition-transform duration-140 active:scale-[0.97]"
                onClick={() => handleQosChange(0)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">QoS 0</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Fire &amp; forget
                  </Badge>
                </div>
                <span className="text-[10px] opacity-80 mt-1">
                  At most once. Low latency, no confirmation packet.
                </span>
              </Button>

              <Button
                variant={activeQoS === 1 ? "default" : "outline"}
                className="h-auto py-2.5 flex flex-col items-start text-left transition-transform duration-140 active:scale-[0.97]"
                onClick={() => handleQosChange(1)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">QoS 1</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
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

      {/* Fault Injections */}
      <Card className="bg-card border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Failure Scenarios
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Trigger simulated environmental and network anomalies to test alerting
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. HVAC Failure */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 hover:border-border transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3 relative overflow-hidden">
              {simStatus.activeAnomaly === "HVAC_FAILURE" && (
                <DitherGradient from="red" direction="up" opacity={0.12} bloom="low" />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-destructive" />
                  <span className="font-bold text-xs text-foreground">
                    HVAC Chiller Failure
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Stops chiller airflow. Causes rack temperatures to climb above 45°C, triggering critical thermal alerts.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs font-mono transition-transform duration-140 active:scale-[0.97] relative z-10"
                onClick={() => handleTriggerAnomaly("HVAC_FAILURE", "HVAC Chiller Failure")}
              >
                Inject thermal runaway
              </Button>
            </div>

            {/* 2. PDU Surge */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 hover:border-border transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3 relative overflow-hidden">
              {simStatus.activeAnomaly === "PDU_SURGE" && (
                <DitherGradient from="orange" direction="up" opacity={0.12} bloom="low" />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-xs text-foreground">
                    PDU Power Overload
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Spikes power draw over 4200W, exceeding the 3800W breaker safety threshold.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-mono border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-transform duration-140 active:scale-[0.97] relative z-10"
                onClick={() => handleTriggerAnomaly("PDU_SURGE", "PDU Power Surge")}
              >
                Inject power surge
              </Button>
            </div>

            {/* 3. Physical Security Breach */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 hover:border-border transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3 relative overflow-hidden">
              {simStatus.activeAnomaly === "SECURITY_BREACH" && (
                <DitherGradient from="red" direction="up" opacity={0.12} bloom="low" />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span className="font-bold text-xs text-foreground">
                    Vault Door Intrusion
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Opens vault door without badge scan, triggering immediate physical intrusion alarms.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs font-mono transition-transform duration-140 active:scale-[0.97] relative z-10"
                onClick={() =>
                  handleTriggerAnomaly("SECURITY_BREACH", "Vault Intrusion")
                }
              >
                Inject intrusion
              </Button>
            </div>

            {/* 4. Seismic / Vibration */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 hover:border-border transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3 relative overflow-hidden">
              {simStatus.activeAnomaly === "SEISMIC_SHAKE" && (
                <DitherGradient from="purple" direction="up" opacity={0.12} bloom="low" />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <span className="font-bold text-xs text-foreground">
                    Chassis Vibration
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Spikes storage rack vibration above 8.0g to simulate disk drive chassis tampering.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-mono border-purple-400/40 text-purple-400 hover:bg-purple-400/10 transition-transform duration-140 active:scale-[0.97] relative z-10"
                onClick={() =>
                  handleTriggerAnomaly("SEISMIC_SHAKE", "Chassis Vibration")
                }
              >
                Inject vibration
              </Button>
            </div>

            {/* 5. Network Congestion */}
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/30 hover:border-border transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3 relative overflow-hidden">
              {simStatus.activeAnomaly === "NETWORK_CONGESTION" && (
                <DitherGradient from="blue" direction="up" opacity={0.12} bloom="low" />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-xs text-foreground">
                    Switch Packet Loss
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Injects 35% packet drops on the fiber switch to simulate interface congestion.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-mono border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 transition-transform duration-140 active:scale-[0.97] relative z-10"
                onClick={() =>
                  handleTriggerAnomaly("NETWORK_CONGESTION", "Switch Packet Loss")
                }
              >
                Inject 35% packet loss
              </Button>
            </div>

            {/* 6. Restore Normal */}
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60 transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-xs text-foreground">
                    Restore Baselines
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Clears all faults. Cools server racks back to 24°C and returns power and network to nominal.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white transition-transform duration-140 active:scale-[0.97]"
                onClick={handleRestoreNormal}
              >
                Restore normal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
