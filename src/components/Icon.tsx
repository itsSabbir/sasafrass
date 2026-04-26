export type IconName =
  | "plus"
  | "save"
  | "upload"
  | "download"
  | "undo"
  | "redo"
  | "trash"
  | "copy"
  | "duplicate"
  | "connector"
  | "fit"
  | "grid"
  | "search"
  | "command"
  | "warning"
  | "check"
  | "zoomIn"
  | "zoomOut";

export function Icon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === "plus" && <path {...common} d="M12 5v14M5 12h14" />}
      {name === "save" && <path {...common} d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6" />}
      {name === "upload" && <path {...common} d="M12 16V5M8 9l4-4 4 4M5 19h14" />}
      {name === "download" && <path {...common} d="M12 5v11M8 12l4 4 4-4M5 20h14" />}
      {name === "undo" && <path {...common} d="M9 7H4v5M4 12a8 8 0 1 0 2.3-5.7" />}
      {name === "redo" && <path {...common} d="M15 7h5v5M20 12a8 8 0 1 1-2.3-5.7" />}
      {name === "trash" && <path {...common} d="M5 7h14M9 7V5h6v2M8 10v9M12 10v9M16 10v9M7 7l1 14h8l1-14" />}
      {name === "copy" && <path {...common} d="M8 8h11v11H8zM5 5h11v3M5 5v11h3" />}
      {name === "duplicate" && <path {...common} d="M7 7h10v10H7zM4 4h10M4 4v10" />}
      {name === "connector" && <path {...common} d="M7 7h3c5 0 4 10 9 10h-3M6 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />}
      {name === "fit" && <path {...common} d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />}
      {name === "grid" && <path {...common} d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16" />}
      {name === "search" && <path {...common} d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" />}
      {name === "command" && <path {...common} d="M9 9H7a3 3 0 1 1 3-3v12a3 3 0 1 1-3-3h10a3 3 0 1 1-3 3V6a3 3 0 1 1 3 3z" />}
      {name === "warning" && <path {...common} d="M12 4 3 20h18zM12 9v5M12 17h.01" />}
      {name === "check" && <path {...common} d="m5 13 4 4L19 7" />}
      {name === "zoomIn" && <path {...common} d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21M10.5 8v5M8 10.5h5" />}
      {name === "zoomOut" && <path {...common} d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21M8 10.5h5" />}
    </svg>
  );
}
