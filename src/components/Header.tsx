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
    // Check initial dark mode
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
      toast.info("Audio alarm muted");
    } else {
      soundManager.playTestBeep();
      toast.success("Audio alarm enabled");
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear all logged events and alerts from SQLite?")) {
      await clearDbHistory();
      onClearHistory();
      toast.success("Database event history cleared");
    }
  };

  return (
    <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
                NetPulse <span className="text-primary">IoT</span>
              </h1>
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                CN Project
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Data Center Environmental Event Logging & Notification Engine
            </p>
          </div>
        </div>

        {/* Live Network & Transport Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MQTT Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border text-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">MQTT:</span>
            <span className="text-emerald-500 font-mono">1883 TCP</span>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border text-xs">
            <Wifi className={`h-3.5 w-3.5 ${wsConnected ? "text-emerald-500" : "text-destructive animate-ping"}`} />
            <span className="font-medium text-foreground">WS:</span>
            <span className={`font-mono ${wsConnected ? "text-emerald-500" : "text-destructive"}`}>
              {wsConnected ? "ONLINE" : "RECONNECTING"}
            </span>
          </div>

          {/* Packets/sec */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border text-xs">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Rate:</span>
            <span className="font-mono font-semibold text-foreground">{packetsPerSec} pkt/s</span>
          </div>

          {/* Anomaly Badge */}
          {activeAnomaly !== "NONE" ? (
            <Badge variant="destructive" className="flex items-center gap-1 animate-bounce">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>CHAOS: {activeAnomaly}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
              Normal Baseline
            </Badge>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 ml-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-foreground"
              onClick={handleToggleMute}
              title={isMuted ? "Unmute Alarm Sounds" : "Mute Alarm Sounds"}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-foreground"
              onClick={toggleDarkMode}
              title="Toggle Dark/Light Mode"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={handleClearHistory}
              title="Clear Database Logs"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
