import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  SearchIcon,
  FilterIcon,
  SortAscIcon,
  TargetIcon,
  Zap,
  TrendingUpIcon,
} from "lucide-react";
import type { Application } from "@/types";

export type StatusFilter =
  | "all"
  | "pending"
  | "review"
  | "accepted"
  | "rejected";
export type SortMode = "recent" | "match" | "name" | "urgent";

interface ApplicantCommandPaletteProps {
  applications: Application[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ApplicantCommandPalette({
  applications,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  searchQuery,
  onSearchChange,
}: ApplicantCommandPaletteProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "PENDING").length,
      review: applications.filter((a) => a.status === "UNDER_REVIEW").length,
      accepted: applications.filter((a) => a.status === "ACCEPTED").length,
      rejected: applications.filter((a) => a.status === "REJECTED").length,
    }),
    [applications]
  );

  const filterOptions = [
    {
      value: "all" as const,
      label: "All Candidates",
      count: stats.total,
      icon: null,
    },
    {
      value: "pending" as const,
      label: "Pending",
      count: stats.pending,
      icon: ClockIcon,
      color: "text-yellow-600",
    },
    {
      value: "review" as const,
      label: "Under Review",
      count: stats.review,
      icon: AlertCircleIcon,
      color: "text-blue-600",
    },
    {
      value: "accepted" as const,
      label: "Accepted",
      count: stats.accepted,
      icon: CheckCircle2Icon,
      color: "text-green-600",
    },
    {
      value: "rejected" as const,
      label: "Rejected",
      count: stats.rejected,
      icon: XCircleIcon,
      color: "text-red-600",
    },
  ];

  const sortOptions = [
    { value: "recent" as const, label: "Most Recent", icon: ClockIcon },
    { value: "match" as const, label: "Best Match", icon: TargetIcon },
    { value: "name" as const, label: "Name A→Z", icon: SortAscIcon },
    { value: "urgent" as const, label: "Needs Action", icon: Zap },
  ];

  const activeFilter = filterOptions.find((f) => f.value === statusFilter);
  const activeSort = sortOptions.find((s) => s.value === sortMode);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-64 max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, skills, or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 bg-background"
        />
      </div>

      {/* Filter */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <FilterIcon className="size-4" />
            <span className="hidden sm:inline">{activeFilter?.label}</span>
            {statusFilter !== "all" && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] tabular-nums"
              >
                {activeFilter?.count}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Filter candidates..." />
            <CommandList>
              <CommandEmpty>No filters found</CommandEmpty>
              <CommandGroup heading="Status">
                {filterOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        onStatusFilterChange(option.value);
                        setFilterOpen(false);
                      }}
                      className="gap-2"
                    >
                      {Icon && (
                        <Icon
                          className={`size-4 ${
                            option.color || "text-muted-foreground"
                          }`}
                        />
                      )}
                      <span className="flex-1">{option.label}</span>
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] tabular-nums"
                      >
                        {option.count}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Sort */}
      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            {activeSort?.icon && <activeSort.icon className="size-4" />}
            <span className="hidden sm:inline">{activeSort?.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Sort by..." />
            <CommandList>
              <CommandEmpty>No sort options</CommandEmpty>
              <CommandGroup>
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        onSortModeChange(option.value);
                        setSortOpen(false);
                      }}
                      className="gap-2"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{option.label}</span>
                      {sortMode === option.value && (
                        <CheckCircle2Icon className="size-4 text-primary ml-auto" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Active Filter Pills */}
      {statusFilter !== "all" && (
        <div className="flex items-center gap-2">
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatusFilterChange("all")}
            className="h-6 px-2 text-xs gap-1.5"
          >
            <XCircleIcon className="size-3" />
            Clear filter
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="ml-auto hidden lg:flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
        <TrendingUpIcon className="size-3.5" />
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {applications.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{stats.total}</span>
        </span>
      </div>
    </div>
  );
}
