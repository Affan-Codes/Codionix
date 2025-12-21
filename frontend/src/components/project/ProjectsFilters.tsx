import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";

interface ProjectsFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export interface FilterState {
  search: string;
  projectType: string;
  difficultyLevel: string;
  status: string;
}

// Helper to convert "all" to empty string for API
export const getApiFilters = (filters: FilterState) => {
  return {
    search: filters.search,
    projectType: filters.projectType === "all" ? "" : filters.projectType,
    difficultyLevel:
      filters.difficultyLevel === "all" ? "" : filters.difficultyLevel,
    status: filters.status === "all" ? "" : filters.status,
  };
};

export function ProjectsFilters({
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: ProjectsFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    projectType: "",
    difficultyLevel: "",
    status: "PUBLISHED", // Default to showing only published projects
  });

  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSelectChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    const clearedFilters: FilterState = {
      search: "",
      projectType: "",
      difficultyLevel: "",
      status: "PUBLISHED",
    };
    setFilters(clearedFilters);
    onClearFilters();
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search projects by title or description..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        {/* Project Type */}
        <Select
          value={filters.projectType}
          onValueChange={(value) => handleSelectChange("projectType", value)}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Project Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PROJECT">Project</SelectItem>
            <SelectItem value="INTERNSHIP">Internship</SelectItem>
          </SelectContent>
        </Select>

        {/* Difficulty Level */}
        <Select
          value={filters.difficultyLevel}
          onValueChange={(value) =>
            handleSelectChange("difficultyLevel", value)
          }
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="BEGINNER">Beginner</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => handleSelectChange("status", value)}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="ml-auto"
          >
            <XIcon className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
