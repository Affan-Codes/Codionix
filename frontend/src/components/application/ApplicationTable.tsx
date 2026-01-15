import { ApplicationRow } from "./ApplicationRow";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon, TargetIcon } from "lucide-react";
import type { Application } from "@/types";
import type { SortKey, SortDir } from "@/pages/applications/MyApplications";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";

interface ApplicationTableProps {
  applications: Application[];
  selectedId: string | null;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onSelect: (id: string) => void;
}

export function ApplicationTable({
  applications,
  selectedId,
  sortKey,
  sortDir,
  onSort,
  onSelect,
}: ApplicationTableProps) {
  const navigate = useNavigate();

  if (applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-4 max-w-sm">
          <TargetIcon className="size-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">
            No applications yet
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Start applying to projects to track your opportunities
          </p>
          <Button onClick={() => navigate(ROUTES.PROJECTS)}>
            Browse Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Desktop Table Header */}
      <div className="hidden md:grid grid-cols-[minmax(200px,1fr)_140px_110px_100px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
        <SortButton
          label="Project"
          sortKey="company"
          active={sortKey === "company"}
          dir={sortDir}
          onClick={() => onSort("company")}
        />
        <SortButton
          label="Status"
          sortKey="status"
          active={sortKey === "status"}
          dir={sortDir}
          onClick={() => onSort("status")}
        />
        <SortButton
          label="Urgency"
          sortKey="urgency"
          active={sortKey === "urgency"}
          dir={sortDir}
          onClick={() => onSort("urgency")}
        />
        <SortButton
          label="Applied"
          sortKey="applied"
          active={sortKey === "applied"}
          dir={sortDir}
          onClick={() => onSort("applied")}
        />
      </div>

      {/* Mobile Table Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
        <SortButton
          label="Applications"
          sortKey="applied"
          active={sortKey === "applied"}
          dir={sortDir}
          onClick={() => onSort("applied")}
        />
        <SortButton
          label="Status"
          sortKey="status"
          active={sortKey === "status"}
          dir={sortDir}
          onClick={() => onSort("status")}
        />
      </div>

      {/* Table Body - Fixed overflow */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="divide-y divide-border">
          {applications.map((app) => (
            <ApplicationRow
              key={app.id}
              application={app}
              selected={selectedId === app.id}
              onClick={() => onSelect(app.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SortButton({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-auto p-0 hover:bg-transparent font-medium justify-start gap-1.5 group"
      key={sortKey}
    >
      <span>{label}</span>
      <span
        className={`${
          active ? "text-primary" : "opacity-0 group-hover:opacity-50"
        }`}
      >
        {active && dir === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        )}
      </span>
    </Button>
  );
}
