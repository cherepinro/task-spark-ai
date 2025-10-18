import { createContext, useContext, useState, type ReactNode } from "react";

interface FilterContextType {
  search: string;
  setSearch: (value: string) => void;
  priority: string;
  setPriority: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  projectId: string;
  setProjectId: (value: string) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [projectId, setProjectId] = useState("all");

  const clearFilters = () => {
    setSearch("");
    setPriority("all");
    setStatus("all");
    setProjectId("all");
  };

  return (
    <FilterContext.Provider
      value={{
        search,
        setSearch,
        priority,
        setPriority,
        status,
        setStatus,
        projectId,
        setProjectId,
        clearFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
