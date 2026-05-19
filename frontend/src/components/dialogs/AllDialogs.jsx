import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default function AllDialogs({
  // dialog open/close states
  signupOpen,
  setSignupOpen,
  forgotOpen,
  setForgotOpen,
  uploadSuccessOpen,
  setUploadSuccessOpen,
  fileErrorOpen,
  setFileErrorOpen,
  editMetaOpen,
  setEditMetaOpen,
  deleteDataOpen,
  setDeleteDataOpen,
  saveConfigOpen,
  setSaveConfigOpen,
  paramErrorOpen,
  setParamErrorOpen,
  runCompleteOpen,
  setRunCompleteOpen,
  regenOpen,
  setRegenOpen,
  retrainOpen,
  setRetrainOpen,
  compareOpen,
  setCompareOpen,

  // shared app state
  datasetName,
  setDatasetName,
  species,
  setSpecies,
  notes,
  setNotes,

  // navigation/actions
  setPage,
  startAnalysis,

  // real analysis data
  resultMetrics,
  classifier,
  sequenceModel,
  predictionEnabled,
  analysisSummary,
  selectedSheet,
  headers,
  tableRows,
}) {
  const spikeCount =
    analysisSummary?.spikeCount ??
    resultMetrics?.spikes ??
    0;

  const sampleCount =
    analysisSummary?.points?.length ??
    tableRows?.length ??
    resultMetrics?.samples ??
    0;

  const classifierLabel =
    classifier === "random-forest"
      ? "Random Forest"
      : classifier === "svm"
        ? "SVM"
        : classifier === "gb"
          ? "Gradient Boosting"
          : classifier || "Classifier";

  const sequenceLabel =
    sequenceModel === "lstm"
      ? "LSTM"
      : sequenceModel === "transformer"
        ? "Transformer"
        : sequenceModel === "tcn"
          ? "Temporal CNN"
          : sequenceModel || "Prediction model";

  const detectedColumns = Array.isArray(headers) ? headers.length : 0;

  return (
    <>
      {/* Create Account */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>Set up access for your research team.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input placeholder="Allison Li" />
            </div>
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input placeholder="The University of Queensland" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="you@uq.edu.au" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm</Label>
                <Input type="password" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignupOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setSignupOpen(false)}
            >
              Create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot Password */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>We will send a recovery link to your email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label>Email</Label>
            <Input placeholder="researcher@uq.edu.au" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setForgotOpen(false)}
            >
              Send reset link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Success */}
      <Dialog open={uploadSuccessOpen} onOpenChange={setUploadSuccessOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Upload successful</DialogTitle>
            <DialogDescription>
              Your dataset has been parsed successfully and is ready for preview.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <div><strong>File:</strong> {datasetName || "Unnamed dataset"}</div>
            <div><strong>Rows detected:</strong> {tableRows?.length || 0}</div>
            <div><strong>Columns detected:</strong> {detectedColumns}</div>
            <div>
              <strong>Sheet:</strong> {selectedSheet || "Default / first sheet"}
            </div>
            <div><strong>Status:</strong> Ready for preview</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadSuccessOpen(false)}>
              Stay here
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setUploadSuccessOpen(false);
              }}
            >
              Go to preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Format Error */}
      <Dialog open={fileErrorOpen} onOpenChange={setFileErrorOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Unable to read file</DialogTitle>
            <DialogDescription>
              The uploaded file could not be processed into a usable dataset.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            Please upload a valid CSV, XLSX, or XLS file that contains at least one readable header row
            and at least one numeric column for analysis.
          </div>
          <DialogFooter>
            <Button onClick={() => setFileErrorOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata */}
      <Dialog open={editMetaOpen} onOpenChange={setEditMetaOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit metadata</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Dataset name</Label>
              <Input
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Species</Label>
              <Input
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMetaOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setEditMetaOpen(false)}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dataset */}
      <Dialog open={deleteDataOpen} onOpenChange={setDeleteDataOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete dataset</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {datasetName || "This dataset"} will be removed from the current workspace.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDataOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDataOpen(false);
                setPage("upload");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Config Preset */}
      <Dialog open={saveConfigOpen} onOpenChange={setSaveConfigOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Save configuration preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label>Preset name</Label>
            <Input placeholder="Butterworth + RF + LSTM" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveConfigOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setSaveConfigOpen(false)}
            >
              Save preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parameter Validation Error */}
      <Dialog open={paramErrorOpen} onOpenChange={setParamErrorOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Parameter validation error</DialogTitle>
            <DialogDescription>
              One or more configuration values are invalid.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            Low cut frequency must be smaller than high cut frequency.
          </div>
          <DialogFooter>
            <Button onClick={() => setParamErrorOpen(false)}>Fix values</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analysis Complete */}
      <Dialog open={runCompleteOpen} onOpenChange={setRunCompleteOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Analysis completed</DialogTitle>
            <DialogDescription>Your workflow has finished successfully.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            Your data has been processed and the results are ready to view. You can explore the analysis summary, model performance metrics, and detailed predictions in the results page.
          </div>
          <DialogFooter>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setRunCompleteOpen(false);
                setPage("analysis");
              }}
            >
              Open results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Interpretation */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Regenerate interpretation</DialogTitle>
            <DialogDescription>
              This will refresh the text summary based on the latest results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setRegenOpen(false)}
            >
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
