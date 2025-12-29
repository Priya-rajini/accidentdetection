import MobileHistoryView from "@/components/MobileHistoryView";

const History = () => {
  return (
    <div className="container mx-auto p-4 lg:p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Incident History</h1>
      <MobileHistoryView />
    </div>
  );
};

export default History;
