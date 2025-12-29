import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ambulance, Clock, Users, MapPin, ExternalLink, AlertCircle } from "lucide-react";
import GoogleMapComponent from "@/components/GoogleMapComponent";

interface Accident {
  id: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  injured: number;
  time: string;
  date: string;
  status: "Ambulance Dispatched" | "Pending";
  lat: number;
  lng: number;
  location: string;
  new: boolean;
}

// Mock data - in production, this would come from an API
const mockAccidents: Accident[] = [
  {
    id: 1,
    severity: "Critical",
    injured: 3,
    time: "10:30 AM",
    date: "2025-01-15",
    status: "Pending",
    lat: 12.9716,
    lng: 77.5946,
    location: "MG Road, Bangalore",
    new: true,
  },
  {
    id: 2,
    severity: "High",
    injured: 1,
    time: "09:15 AM",
    date: "2025-01-15",
    status: "Ambulance Dispatched",
    lat: 13.0827,
    lng: 80.2707,
    location: "Anna Salai, Chennai",
    new: false,
  },
  {
    id: 3,
    severity: "Medium",
    injured: 2,
    time: "08:45 AM",
    date: "2025-01-15",
    status: "Pending",
    lat: 12.9352,
    lng: 77.6245,
    location: "Koramangala, Bangalore",
    new: false,
  },
  {
    id: 4,
    severity: "Low",
    injured: 1,
    time: "07:20 AM",
    date: "2025-01-15",
    status: "Ambulance Dispatched",
    lat: 13.0358,
    lng: 77.5970,
    location: "Whitefield, Bangalore",
    new: false,
  },
];

const getSeverityColor = (severity: Accident["severity"]) => {
  switch (severity) {
    case "Critical":
      return "bg-red-600 text-white";
    case "High":
      return "bg-orange-500 text-white";
    case "Medium":
      return "bg-yellow-500 text-black";
    case "Low":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const getStatusColor = (status: Accident["status"]) => {
  return status === "Ambulance Dispatched"
    ? "bg-green-500 text-white"
    : "bg-yellow-500 text-black";
};

const HospitalDashboard = () => {
  const [accidents, setAccidents] = useState<Accident[]>(mockAccidents);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);

  // Sort accidents by priority (Critical first, then by time)
  const sortedAccidents = [...accidents].sort((a, b) => {
    const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const severityDiff =
      severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    // If same severity, newer accidents first
    return b.new ? 1 : -1;
  });

  // Real-time alert badge count
  const newAccidentsCount = accidents.filter((a) => a.new).length;

  // Statistics
  const totalAccidents = accidents.length;
  const criticalCount = accidents.filter((a) => a.severity === "Critical").length;
  const pendingCount = accidents.filter((a) => a.status === "Pending").length;
  const totalInjured = accidents.reduce((sum, a) => sum + a.injured, 0);

  // Simulate real-time updates (in production, this would be WebSocket/SSE)
  useEffect(() => {
    const interval = setInterval(() => {
      // This would fetch new accidents from API
      // For demo, we'll just update the "new" status
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleViewOnGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header with real-time alert badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Ambulance className="h-8 w-8 text-primary" />
            Hospital Emergency Response
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time accident alerts and emergency coordination
          </p>
        </div>
        {newAccidentsCount > 0 && (
          <Badge
            variant="destructive"
            className="px-4 py-2 text-lg animate-pulse"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {newAccidentsCount} New Alert{newAccidentsCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accidents</p>
                <p className="text-2xl font-bold">{totalAccidents}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Injured</p>
                <p className="text-2xl font-bold">{totalInjured}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accident Alert Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Accident Alerts</h2>
          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {sortedAccidents.map((accident) => (
              <Card
                key={accident.id}
                className={`relative transition-all hover:shadow-lg cursor-pointer ${
                  selectedAccident?.id === accident.id
                    ? "ring-2 ring-primary"
                    : ""
                } ${accident.new ? "border-l-4 border-l-red-600" : ""}`}
                onClick={() => setSelectedAccident(accident)}
              >
                {accident.new && (
                  <Badge
                    className="absolute top-2 right-2 bg-red-600 animate-pulse"
                  >
                    NEW
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Badge className={getSeverityColor(accident.severity)}>
                        {accident.severity}
                      </Badge>
                      <span className="text-lg">Accident #{accident.id}</span>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Injured</p>
                        <p className="font-semibold">{accident.injured} person(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-semibold">{accident.time}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold text-sm">{accident.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge className={getStatusColor(accident.status)}>
                      {accident.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {accident.date}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Location Map</h2>
          {selectedAccident ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Accident #{selectedAccident.id} - {selectedAccident.location}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative h-[400px] rounded-lg overflow-hidden border">
                  <GoogleMapComponent
                    lat={selectedAccident.lat}
                    lng={selectedAccident.lng}
                    zoom={15}
                  />
                </div>
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latitude:</span>
                    <span className="font-mono font-semibold">
                      {selectedAccident.lat.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Longitude:</span>
                    <span className="font-mono font-semibold">
                      {selectedAccident.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    handleViewOnGoogleMaps(
                      selectedAccident.lat,
                      selectedAccident.lng
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Google Maps
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[500px]">
                <div className="text-center space-y-2">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Select an accident to view on map
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
