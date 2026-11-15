import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { soundManager } from "@/lib/sound";
import { clearDbHistory } from "@/lib/api";
import {
  Server,
  Activity,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Trash2,
  Radio,
  Wifi,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface HeaderProps {
  wsConnected: boolean;
  packetsPerSec: number;
  activeAnomaly: string;
  totalAlerts?: number;
  onClearHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  wsConnected,
  packetsPerSec,
  activeAnomaly,
  onClearHistory,
}) => {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
    if (next) {
      toast.info("Audio muted");
    } else {
      soundManager.playTestBeep();
      toast.success("Audio enabled");
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Clear all logged events and alerts from SQLite?")) {
      await clearDbHistory();
      onClearHistory();
      toast.success("Event logs cleared");
    }
  };

  return (
    <header className="border-b border-border/80 bg-card/70 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-xs transition-transform duration-150 active:scale-95">
            <Server className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground font-sans">
                NetPulse <span className="text-primary">IoT</span>
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary py-0">
                CN Project
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Server room telemetry &amp; alert engine
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MQTT */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border/80 text-xs font-mono">
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">MQTT</span>
            <span className="text-emerald-500 font-semibold">1883</span>
          </div>

          {/* WebSocket */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border/80 text-xs font-mono">
            <Wifi className={`h-3 w-3 ${wsConnected ? "text-emerald-500" : "text-destructive animate-ping"}`} />
            <span className="text-muted-foreground">WS</span>
            <span className={`font-semibold ${wsConnected ? "text-emerald-500" : "text-destructive"}`}>
              {wsConnected ? "3001" : "RECONNECTING"}
            </span>
          </div>

          {/* Ingress Rate */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border/80 text-xs font-mono">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">Ingress:</span>
            <span className="font-semibold text-foreground">{packetsPerSec} pkt/s</span>
          </div>

          {/* Anomaly Badge */}
          {activeAnomaly !== "NONE" ? (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs font-mono animate-pulse">
              <ShieldAlert className="h-3 w-3" />
              <span>FAULT: {activeAnomaly}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[11px] font-mono text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
              Normal
            </Badge>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1 ml-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="h-8 w-8 text-foreground transition-transform duration-140 active:scale-[0.95]"
              onClick={handleToggleMute}
              title={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-primary" />}
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              className="h-8 w-8 text-foreground transition-transform duration-140 active:scale-[0.95]"
              onClick={toggleDarkMode}
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-transform duration-140 active:scale-[0.95]"
              onClick={handleClearHistory}
              title="Clear SQLite logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
