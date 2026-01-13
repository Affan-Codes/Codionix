import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, XIcon, SlidersHorizontalIcon } from "lucide-react";
import { useState, useEffect, useId } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export interface FilterState {
  search: string;
  projectType: string;
  difficultyLevel: string;
  status: string;
}

interface ProjectsFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ProjectsFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: ProjectsFiltersProps) {
  const uid = useId();

  // Local state for immediate UI updates (search only)
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Debounce search for API calls
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync local search with prop changes (external resets)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Notify parent when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const handleSelectChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs gap-1"
          >
            <XIcon className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label
          htmlFor={`${uid}-search`}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Search
        </Label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id={`${uid}-search`}
            placeholder="Title, company, skill..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Type */}
      <div className="space-y-2">
        <Label
          htmlFor={`${uid}-type`}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Type
        </Label>
        <Select
          value={filters.projectType || "all"}
          onValueChange={(value) => handleSelectChange("projectType", value)}
        >
          <SelectTrigger id={`${uid}-type`} className="w-full h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PROJECT">Project</SelectItem>
            <SelectItem value="INTERNSHIP">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label
          htmlFor={`${uid}-difficulty`}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Difficulty
        </Label>
        <Select
          value={filters.difficultyLevel || "all"}
          onValueChange={(value) =>
            handleSelectChange("difficultyLevel", value)
          }
        >
          <SelectTrigger id={`${uid}-difficulty`} className="w-full h-9">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="BEGINNER">Beginner</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label
          htmlFor={`${uid}-status`}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Status
        </Label>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => handleSelectChange("status", value)}
        >
          <SelectTrigger id={`${uid}-status`} className="w-full h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear All Button (Bottom) */}
      {hasActiveFilters && (
        <>
          <div className="border-t border-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="w-full gap-2 h-9"
          >
            <XIcon className="size-4" />
            Clear All Filters
          </Button>
        </>
      )}
    </div>
  );
}
