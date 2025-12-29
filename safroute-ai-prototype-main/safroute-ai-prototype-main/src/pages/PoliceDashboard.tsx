import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Car,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import { useToast } from "@/components/ui/use-toast";

interface Accident {
  id: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  vehicles: number;
  roadType: "Highway" | "City" | "Junction";
  time: string;
  date: string;
  trafficStatus: "Road Blocked" | "Diverted" | "Cleared";
  lat: number;
  lng: number;
  location: string;
  investigationStatus: "Pending" | "Under Investigation" | "Completed";
}

// Mock data - in production, this would come from an API
const mockAccidents: Accident[] = [
  {
    id: 1,
    severity: "Critical",
    vehicles: 2,
    roadType: "Highway",
    time: "10:30 AM",
    date: "2025-01-15",
    trafficStatus: "Road Blocked",
    lat: 12.9716,
    lng: 77.5946,
    location: "MG Road, Bangalore",
    investigationStatus: "Pending",
  },
  {
    id: 2,
    severity: "High",
    vehicles: 1,
    roadType: "City",
    time: "09:15 AM",
    date: "2025-01-15",
    trafficStatus: "Diverted",
    lat: 13.0827,
    lng: 80.2707,
    location: "Anna Salai, Chennai",
    investigationStatus: "Under Investigation",
  },
  {
    id: 3,
    severity: "Medium",
    vehicles: 3,
    roadType: "Junction",
    time: "08:45 AM",
    date: "2025-01-15",
    trafficStatus: "Cleared",
    lat: 12.9352,
    lng: 77.6245,
    location: "Koramangala Junction, Bangalore",
    investigationStatus: "Completed",
  },
  {
    id: 4,
    severity: "Low",
    vehicles: 2,
    roadType: "City",
    time: "07:20 AM",
    date: "2025-01-15",
    trafficStatus: "Cleared",
    lat: 13.0358,
    lng: 77.5970,
    location: "Whitefield, Bangalore",
    investigationStatus: "Completed",
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

const getTrafficStatusColor = (status: Accident["trafficStatus"]) => {
  switch (status) {
    case "Road Blocked":
      return "bg-red-600 text-white";
    case "Diverted":
      return "bg-orange-500 text-white";
    case "Cleared":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const PoliceDashboard = () => {
  const [accidents, setAccidents] = useState<Accident[]>(mockAccidents);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(
    null
  );
  const { toast } = useToast();

  // Sort accidents by priority (Critical first)
  const sortedAccidents = [...accidents].sort((a, b) => {
    const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const handleStatusChange = (id: number, status: Accident["investigationStatus"]) => {
    setAccidents((prev) =>
      prev.map((accident) =>
        accident.id === id ? { ...accident, investigationStatus: status } : accident
      )
    );
    toast({
      title: "Status Updated",
      description: `Investigation status changed to ${status}`,
    });
  };

  const handleRoadCleared = (id: number) => {
    setAccidents((prev) =>
      prev.map((accident) =>
        accident.id === id
          ? { ...accident, trafficStatus: "Cleared" as const, investigationStatus: "Completed" as const }
          : accident
      )
    );
    toast({
      title: "Road Cleared",
      description: "Traffic status updated and investigation marked as completed",
    });
  };

  const handleViewOnGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  // Statistics
  const totalAccidents = accidents.length;
  const blockedCount = accidents.filter(
    (a) => a.trafficStatus === "Road Blocked"
  ).length;
  const underInvestigationCount = accidents.filter(
    (a) => a.investigationStatus === "Under Investigation"
  ).length;
  const clearedCount = accidents.filter(
    (a) => a.trafficStatus === "Cleared"
  ).length;

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Police Traffic & Investigation
        </h1>
        <p className="text-muted-foreground mt-1">
          Traffic control and accident investigation management
        </p>
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
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Road Blocked</p>
                <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Under Investigation</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {underInvestigationCount}
                </p>
              </div>
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cleared</p>
                <p className="text-2xl font-bold text-green-600">{clearedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accident Overview Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Accident Overview</h2>
          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {sortedAccidents.map((accident) => (
              <Card
                key={accident.id}
                className={`transition-all hover:shadow-lg cursor-pointer ${
                  selectedAccident?.id === accident.id
                    ? "ring-2 ring-primary"
                    : ""
                }`}
                onClick={() => setSelectedAccident(accident)}
              >
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
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicles</p>
                        <p className="font-semibold">{accident.vehicles}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Road Type</p>
                        <p className="font-semibold">{accident.roadType}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Time & Date</p>
                      <p className="font-semibold text-sm">
                        {accident.time} - {accident.date}
                      </p>
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
                    <Badge className={getTrafficStatusColor(accident.trafficStatus)}>
                      {accident.trafficStatus}
                    </Badge>
                    <Badge
                      variant={
                        accident.investigationStatus === "Completed"
                          ? "default"
                          : accident.investigationStatus === "Under Investigation"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {accident.investigationStatus}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(accident.id, "Under Investigation");
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Under Investigation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoadCleared(accident.id);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Road Cleared
                    </Button>
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

export default PoliceDashboard;
