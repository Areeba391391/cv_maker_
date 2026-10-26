"use client";

import { createContext, useContext } from "react";
import { getWorkspaceLabels, type WorkspaceLabels } from "@/lib/workspace/types";

const WorkspaceContext = createContext<WorkspaceLabels>(getWorkspaceLabels("general"));

export function WorkspaceProvider({
  labels,
  children,
}: {
  labels: WorkspaceLabels;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={labels}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceLabels() {
  return useContext(WorkspaceContext);
}
