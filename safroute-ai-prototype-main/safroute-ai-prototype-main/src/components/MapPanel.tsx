import { MapPin, Hospital, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MapPanel = () => {
  const accidents = [
    { id: 1, lat: 13.0827, lng: 80.2707, location: "Anna Salai", severity: "high" },
    { id: 2, lat: 13.0569, lng: 80.2425, location: "T Nagar", severity: "medium" },
  ];

  const hospitals = [
    { id: 1, lat: 13.0878, lng: 80.2785, name: "Rajiv Gandhi Hospital" },
    { id: 2, lat: 13.0612, lng: 80.2489, name: "Apollo Hospital" },
  ];

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Incident Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
          {/* Simplified map representation */}
          <div className="absolute inset-0">
            {/* Grid lines for map effect */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Accident markers */}
            {accidents.map((accident, index) => (
              <div
                key={accident.id}
                className="absolute animate-blink-marker"
                style={{
                  left: `${30 + index * 30}%`,
                  top: `${40 + index * 20}%`,
                }}
              >
                <div className="relative">
                  <div className={`h-8 w-8 rounded-full ${
                    accident.severity === 'high' 
                      ? 'bg-destructive alert-glow' 
                      : 'bg-warning'
                  } flex items-center justify-center shadow-lg`}>
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-background/90 backdrop-blur px-2 py-1 rounded text-xs font-medium border shadow-md">
                    {accident.location}
                  </div>
                </div>
              </div>
            ))}

            {/* Hospital markers */}
            {hospitals.map((hospital, index) => (
              <div
                key={hospital.id}
                className="absolute"
                style={{
                  left: `${35 + index * 30}%`,
                  top: `${35 + index * 25}%`,
                }}
              >
                <div className="relative">
                  <div className="h-7 w-7 rounded-full bg-success flex items-center justify-center shadow-lg">
                    <Hospital className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-background/90 backdrop-blur px-2 py-1 rounded text-xs font-medium border shadow-md">
                    {hospital.name}
                  </div>
                </div>
              </div>
            ))}

            {/* Route lines connecting accidents to hospitals */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="30%"
                y1="40%"
                x2="35%"
                y2="35%"
                stroke="hsl(var(--destructive))"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur border rounded-lg p-3 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-full bg-destructive"></div>
              <span>High Severity</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-full bg-warning"></div>
              <span>Medium Severity</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-full bg-success"></div>
              <span>Hospital</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapPanel;
