import type { Application } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";
import { Link } from "react-router";

interface ApplicationCardProps {
  application: Application;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-200",
    ACCEPTED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
  };

  const statusText = {
    PENDING: "Pending",
    UNDER_REVIEW: "Under Review",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-xl line-clamp-1">
            {application.project?.title}
          </CardTitle>
          <Badge className={statusColors[application.status]} variant="outline">
            {statusText[application.status]}
          </Badge>
        </div>
        {application.project?.companyName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BriefcaseIcon className="h-4 w-4" />
            <span>{application.project.companyName}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Application Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarIcon className="h-4 w-4" />
          <span>
            Applied{" "}
            {formatDistanceToNow(new Date(application.appliedAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Review Date */}
        {application.reviewedAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ClockIcon className="h-4 w-4" />
            <span>
              Reviewed on{" "}
              {format(new Date(application.reviewedAt), "MMM dd, yyyy")}
            </span>
          </div>
        )}

        {/* Cover Letter Preview */}
        <div className="pt-2">
          <p className="text-sm text-gray-500 mb-1 font-medium">
            Cover Letter:
          </p>
          <p className="text-sm text-gray-700 line-clamp-3">
            {application.coverLetter}
          </p>
        </div>

        {/* Rejection Reason */}
        {application.status === "REJECTED" && application.rejectionReason && (
          <div className="pt-2 border-t">
            <p className="text-sm text-red-600 mb-1 font-medium">
              Rejection Reason:
            </p>
            <p className="text-sm text-gray-700">
              {application.rejectionReason}
            </p>
          </div>
        )}

        {/* Acceptance Message */}
        {application.status === "ACCEPTED" && (
          <div className="pt-2 border-t">
            <p className="text-sm text-green-600 font-medium">
              🎉 Congratulations! Your application has been accepted.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link to={`/projects/${application.project?.id}`}>
            <FileTextIcon className="h-4 w-4" />
            View Project
          </Link>
        </Button>
        {application.resumeUrl && (
          <Button asChild variant="outline" className="flex-1">
            <a
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Resume
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
