import { Clock, MapPin, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryItem {
  id: number;
  date: string;
  time: string;
  location: string;
  severity: "high" | "medium" | "low";
  status: "resolved" | "sent" | "pending";
}

const MobileHistoryView = () => {
  const history: HistoryItem[] = [
    {
      id: 1,
      date: "Today",
      time: "2:45 PM",
      location: "Anna Salai, Near Thousand Lights",
      severity: "high",
      status: "sent",
    },
    {
      id: 2,
      date: "Today",
      time: "1:20 PM",
      location: "T Nagar, Ranganathan Street",
      severity: "medium",
      status: "pending",
    },
    {
      id: 3,
      date: "Yesterday",
      time: "11:05 AM",
      location: "Mount Road Junction",
      severity: "low",
      status: "resolved",
    },
    {
      id: 4,
      date: "Yesterday",
      time: "9:30 AM",
      location: "Adyar Signal",
      severity: "medium",
      status: "resolved",
    },
    {
      id: 5,
      date: "2 days ago",
      time: "4:15 PM",
      location: "Velachery Main Road",
      severity: "high",
      status: "resolved",
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
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "sent":
        return <Send className="h-4 w-4 text-primary" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 animate-fade-in">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <h1 className="text-xl font-bold">Incident History</h1>
        <p className="text-sm text-muted-foreground">Past alerts and responses</p>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-3">
          {history.map((item, index) => (
            <Card key={item.id} className="animate-slide-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(item.status)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(item.severity) as any} className="text-xs">
                            {item.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.time}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2 border-t">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{item.location}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MobileHistoryView;
