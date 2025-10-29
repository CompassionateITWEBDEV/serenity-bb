"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";

interface VerifyStaffButtonProps {
  staffId: string;
  staffName: string;
}

export default function VerifyStaffButton({ staffId, staffName }: VerifyStaffButtonProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/verifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          rating: rating || null,
          comment: comment.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to verify staff member");
      }

      setVerified(true);
      toast.success(`Successfully verified ${staffName}`);
      setOpen(false);
      setRating(null);
      setComment("");
    } catch (error: any) {
      console.error("Error verifying staff:", error);
      toast.error(error.message || "Failed to verify staff member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => !verified && setOpen(true)}
        >
          {verified ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Verified
            </>
          ) : (
            <>
              <Star className="h-4 w-4" />
              Verify
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify {staffName}</DialogTitle>
          <DialogDescription>
            Help other patients by verifying this healthcare provider. You can provide a rating and optional feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rating (optional)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                    rating === value ? "bg-yellow-50" : ""
                  }`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      rating && value <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this provider..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying..." : "Submit Verification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

