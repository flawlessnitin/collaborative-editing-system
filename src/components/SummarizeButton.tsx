"use client";

import { useState } from "react";
import { summarizeDocumentAction } from "@/lib/ai/summarize";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SummarizeButton = ({ documentId }: { documentId: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string } | { error: string } | null>(null);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next) {
      return;
    }
    setLoading(true);
    setResult(await summarizeDocumentAction(documentId));
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          AI Summary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Summary</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Summarizing…</p>}
        {!loading && result && "error" in result && (
          <p className="text-sm text-destructive">{result.error}</p>
        )}
        {!loading && result && "summary" in result && (
          <p className="text-sm leading-relaxed">{result.summary}</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SummarizeButton;
