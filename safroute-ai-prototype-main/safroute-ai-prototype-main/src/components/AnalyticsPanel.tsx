import { TrendingUp, Activity, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const AnalyticsPanel = () => {
  const stats = [
    {
      title: "Today's Incidents",
      value: "12",
      change: "+3 from yesterday",
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      title: "Avg Response Time",
      value: "2.4 min",
      change: "-0.5 min improvement",
      icon: Clock,
      color: "text-success",
    },
    {
      title: "Resolution Rate",
      value: "94%",
      change: "+5% this week",
      icon: Activity,
      color: "text-primary",
    },
    {
      title: "Active Cameras",
      value: "48/50",
      change: "2 offline",
      icon: TrendingUp,
      color: "text-warning",
    },
  ];

  const severityData = [
    { level: "High", count: 5, percentage: 42, color: "bg-destructive" },
    { level: "Medium", count: 4, percentage: 33, color: "bg-warning" },
    { level: "Low", count: 3, percentage: 25, color: "bg-success" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Severity Breakdown */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="text-base">Incident Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {severityData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.level}</span>
                <span className="text-muted-foreground">{item.count} incidents ({item.percentage}%)</span>
              </div>
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="text-base">7-Day Incident Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-end justify-between gap-2 h-32">
            {[8, 12, 6, 15, 10, 14, 12].map((value, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-primary/20 rounded-t relative overflow-hidden" style={{ height: `${(value / 15) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary to-accent" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPanel;
