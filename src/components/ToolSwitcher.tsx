import type { Tool } from "../app/appTypes";

interface ToolSwitcherProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
}

const tools: { id: Tool; label: string; hint: string }[] = [
  { id: "compactor", label: "Code Compactor", hint: "Strip SAS DIS boilerplate down to the real logic" },
  { id: "planner", label: "Flow Planner", hint: "Design SASDIS job flows and DevOps handoff" }
];

export function ToolSwitcher({ tool, setTool }: ToolSwitcherProps) {
  return (
    <header className="tool-switcher">
      <div className="tool-switcher-brand">sasafrass</div>
      <nav className="tool-tabs" aria-label="Tool">
        {tools.map((entry) => (
          <button
            key={entry.id}
            className={tool === entry.id ? "active" : ""}
            title={entry.hint}
            aria-pressed={tool === entry.id}
            onClick={() => setTool(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
