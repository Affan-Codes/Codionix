import type { Application } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { CalendarIcon, FileTextIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";

interface ApplicantCardProps {
  application: Application;
  onReview: (applicationId: string) => void;
}

export function ApplicantCard({ application, onReview }: ApplicantCardProps) {
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

  const canReview =
    application.status === "PENDING" || application.status === "UNDER_REVIEW";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-lg">
              {application.student?.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">
                {application.student?.fullName}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {application.student?.email}
              </p>
            </div>
          </div>
          <Badge className={statusColors[application.status]} variant="outline">
            {statusText[application.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Skills */}
        {application.student?.skills &&
          application.student.skills.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2 font-medium">Skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {application.student.skills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {application.student.skills.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{application.student.skills.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

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

        {/* Cover Letter Preview */}
        <div className="pt-2">
          <p className="text-sm text-gray-500 mb-1 font-medium">
            Cover Letter:
          </p>
          <p className="text-sm text-gray-700 line-clamp-4">
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
      </CardContent>

      <CardFooter className="gap-2">
        {application.resumeUrl && (
          <Button asChild variant="outline" className="flex-1">
            <a
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileTextIcon className="h-4 w-4" />
              Resume
            </a>
          </Button>
        )}

        {canReview && (
          <Button onClick={() => onReview(application.id)} className="flex-1">
            Review
          </Button>
        )}

        {!canReview && (
          <Button variant="outline" className="flex-1" disabled>
            {application.status === "ACCEPTED" ? "Accepted" : "Rejected"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
