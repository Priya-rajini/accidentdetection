import AlertsPanel from "@/components/AlertsPanel";

const Alerts = () => {
  return (
    <div className="container mx-auto p-4 lg:p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Alert Management</h1>
      <AlertsPanel />
    </div>
  );
};

export default Alerts;
