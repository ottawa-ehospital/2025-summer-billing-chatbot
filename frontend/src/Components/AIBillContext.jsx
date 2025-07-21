import React, { createContext, useContext, useState } from "react";

export const AIBillContext = createContext();

export const AIBillProvider = ({ children }) => {
  const [extractedInfo, setExtractedInfo] = useState({});

  const handleAIAutoFill = (info) => {
    setExtractedInfo(info);
  };

  return (
    <AIBillContext.Provider value={{ extractedInfo, handleAIAutoFill }}>
      {children}
    </AIBillContext.Provider>
  );
};

export const useAIBill = () => useContext(AIBillContext); 