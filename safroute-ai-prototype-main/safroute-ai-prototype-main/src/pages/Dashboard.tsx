import VideoFeedPanel from "@/components/VideoFeedPanel";
import MapPanel from "@/components/MapPanel";

const Dashboard = () => {
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Live Monitoring</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VideoFeedPanel />
        <MapPanel />
      </div>
    </div>
  );
};

export default Dashboard;
