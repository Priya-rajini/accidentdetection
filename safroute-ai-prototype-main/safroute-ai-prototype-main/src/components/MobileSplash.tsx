import { useEffect, useState } from "react";

const MobileSplash = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="h-24 w-24 mx-auto rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-2xl glow-effect">
            <span className="text-5xl font-bold text-white">SR</span>
          </div>
          <div className="absolute inset-0 h-24 w-24 mx-auto rounded-2xl bg-white/5 animate-pulse-alert" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">SafeRoute AI</h1>
          <p className="text-white/80">AI-Powered Safety Monitoring</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/60 animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="h-2 w-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
};

export default MobileSplash;
