import { Clock, MapPin, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: number;
  time: string;
  location: string;
  severity: "high" | "medium" | "low";
  status: "sent" | "pending" | "resolved";
  notifiedTo: string[];
}

const AlertsPanel = () => {
  const alerts: Alert[] = [
    {
      id: 1,
      time: "2:45 PM",
      location: "Anna Salai, Near Thousand Lights",
      severity: "high",
      status: "sent",
      notifiedTo: ["Rajiv Gandhi Hospital", "Police Station 15"],
    },
    {
      id: 2,
      time: "1:20 PM",
      location: "T Nagar, Ranganathan Street",
      severity: "medium",
      status: "pending",
      notifiedTo: ["Apollo Hospital"],
    },
    {
      id: 3,
      time: "11:05 AM",
      location: "Mount Road Junction",
      severity: "low",
      status: "resolved",
      notifiedTo: ["City Hospital"],
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "resolved":
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Recent Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border bg-card hover:shadow-md transition-all ${
              alert.severity === "high" ? "border-destructive/30" : ""
            } animate-slide-in-up`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    {getStatusIcon(alert.status)}
                    {alert.status}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{alert.time}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{alert.location}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notified:</p>
                  <div className="flex flex-wrap gap-1">
                    {alert.notifiedTo.map((entity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {entity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
