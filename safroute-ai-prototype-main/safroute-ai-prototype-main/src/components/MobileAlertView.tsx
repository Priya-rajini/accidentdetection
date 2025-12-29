import { MapPin, Clock, AlertTriangle, Hospital, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MobileAlertView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 space-y-4 animate-fade-in">
      {/* Alert Header */}
      <Card className="border-destructive/30 alert-glow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 animate-pulse-alert">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <Badge variant="destructive" className="mb-2">HIGH SEVERITY</Badge>
              <h2 className="text-lg font-bold mb-1">Accident Detected</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>2:45 PM • Just now</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Anna Salai, Near Thousand Lights</p>
                <p className="text-sm text-muted-foreground">Chennai, Tamil Nadu</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="bg-success/5 border-success/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Hospital className="h-5 w-5 text-success" />
            <h3 className="font-semibold">Alert Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rajiv Gandhi Hospital</span>
              <Badge variant="outline" className="text-success border-success">Notified</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Police Station 15</span>
              <Badge variant="outline" className="text-success border-success">Notified</Badge>
            </div>
          </div>
          <div className="pt-2 text-xs text-muted-foreground">
            Emergency services have been alerted and are responding
          </div>
        </CardContent>
      </Card>

      {/* Map Preview */}
      <Card>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
            {/* Simplified map */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              <defs>
                <pattern id="mobile-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mobile-grid)" />
            </svg>

            {/* Accident marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-12 w-12 rounded-full bg-destructive flex items-center justify-center shadow-lg animate-blink-marker alert-glow">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Hospital marker */}
            <div className="absolute top-1/4 right-1/4">
              <div className="h-10 w-10 rounded-full bg-success flex items-center justify-center shadow-lg">
                <Hospital className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="50%"
                y1="50%"
                x2="75%"
                y2="25%"
                stroke="hsl(var(--destructive))"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Button className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg glow-effect">
        <Navigation className="h-4 w-4" />
        View Full Route
      </Button>
    </div>
  );
};

export default MobileAlertView;
