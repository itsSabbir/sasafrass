import type { CommandAction } from "../app/appTypes";
import { Icon } from "./Icon";

interface CommandPaletteProps {
  commands: CommandAction[];
  query: string;
  setQuery: (value: string) => void;
  close: () => void;
}

export function CommandPalette({ commands, query, setQuery, close }: CommandPaletteProps) {
  const filteredCommands = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="command-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input-wrap">
          <Icon name="search" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" />
        </div>
        <div className="command-list">
          {filteredCommands.map((command) => (
            <button
              key={command.id}
              onClick={() => {
                command.action();
                close();
              }}
            >
              {command.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
