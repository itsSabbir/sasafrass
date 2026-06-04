import { useEffect, useState } from "react";
import type { Tool } from "./app/appTypes";
import { loadInitialTool, persistTool } from "./app/storage";
import type { SasFileAnalysis } from "./cleaner/types";
import { ToolSwitcher } from "./components/ToolSwitcher";
import { PlannerTool } from "./features/planner/PlannerTool";
import { CodeCleanerView } from "./views/CodeCleanerView";

export default function App() {
  const [tool, setTool] = useState<Tool>(loadInitialTool);
  const [pendingImport, setPendingImport] = useState<SasFileAnalysis[] | null>(null);

  useEffect(() => {
    persistTool(tool);
  }, [tool]);

  return (
    <div className="app-root">
      <ToolSwitcher tool={tool} setTool={setTool} />
      <div className="tool-surface">
        {tool === "compactor" ? (
          <CodeCleanerView
            onImportToFlow={(analyses) => {
              setPendingImport(analyses);
              setTool("planner");
            }}
          />
        ) : (
          <PlannerTool pendingImport={pendingImport} onImportConsumed={() => setPendingImport(null)} />
        )}
      </div>
    </div>
  );
}
