import React from "react";
import { type Alert, acknowledgeAlert } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, ShieldAlert, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ActiveAlertsBannerProps {
  alerts: Alert[];
  onAlertAcknowledged: (id: number) => void;
}

export const ActiveAlertsBanner: React.FC<ActiveAlertsBannerProps> = ({
  alerts,
  onAlertAcknowledged,
}) => {
  const unackAlerts = alerts.filter((a) => !a.acknowledged);

  if (unackAlerts.length === 0) return null;

  const topAlert = unackAlerts[0];

  const handleAck = async (id: number) => {
    await acknowledgeAlert(id);
    onAlertAcknowledged(id);
    toast.success(`Alert #${id} acknowledged`);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "THERMAL":
        return <Flame className="h-4.5 w-4.5 text-destructive animate-pulse" />;
      case "POWER":
        return <Zap className="h-4.5 w-4.5 text-amber-500 animate-pulse" />;
      case "INTRUSION":
        return <ShieldAlert className="h-4.5 w-4.5 text-destructive animate-pulse" />;
      default:
        return <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />;
    }
  };

  const isCritical = topAlert.severity === "CRITICAL";

  return (
    <div
      className={`border-b px-4 lg:px-8 py-2.5 transition-[background-color,border-color] duration-150 ${
        isCritical
          ? "bg-destructive/15 border-destructive/40 text-destructive-foreground animate-in fade-in"
          : "bg-amber-500/15 border-amber-500/40 text-foreground animate-in fade-in"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-full bg-background/80 shadow-xs">
            {getAlertIcon(topAlert.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isCritical ? "destructive" : "secondary"}
                className={`text-[10px] font-mono font-bold ${
                  !isCritical ? "bg-amber-500 text-black hover:bg-amber-600" : ""
                }`}
              >
                {topAlert.severity}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                Node: <span className="font-semibold text-foreground">{topAlert.node_id}</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono hidden md:inline">
                ({new Date(topAlert.timestamp).toLocaleTimeString()})
              </span>
              {unackAlerts.length > 1 && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  +{unackAlerts.length - 1} pending
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold tracking-tight text-foreground mt-0.5">
              {topAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="sm"
            variant={isCritical ? "destructive" : "default"}
            className="flex items-center gap-1.5 shadow-xs text-xs font-mono transition-transform duration-140 active:scale-[0.97]"
            onClick={() => handleAck(topAlert.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Acknowledge</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
