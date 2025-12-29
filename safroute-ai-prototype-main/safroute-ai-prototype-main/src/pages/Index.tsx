import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileSplash from "@/components/MobileSplash";

const Index = () => {
  const navigate = useNavigate();

  const handleFinish = () => {
    navigate("/");
  };

  return <MobileSplash onFinish={handleFinish} />;
};

export default Index;
