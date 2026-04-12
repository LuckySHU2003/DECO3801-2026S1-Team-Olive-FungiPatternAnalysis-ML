import React, { useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Eye, Table2, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SectionTitle from "@/components/shared/SectionTitle";

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleString();
}

export default function Upload({
  onFileUpload,
  datasetName,
  uploadedDatasets = [],
  onOpenUploadedDataset,
  onGoToCompare,
}) {
  const fileInputRef = useRef(null);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileUpload(file);
    e.target.value = "";
  };

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Upload Dataset"
        desc="Upload a CSV or Excel file from your computer. Your uploaded datasets are stored below so you can reopen their preview."
        action={
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => onGoToCompare?.()}
            disabled={uploadedDatasets.length < 2}
          >
            Compare Dataset
          </Button>
        }
      />

      <Card className="rounded-[28px] border-dashed border-2 border-slate-200">
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-emerald-50 p-4 text-emerald-600">
            <UploadCloud className="h-10 w-10" />
          </div>

          <h3 className="mt-5 text-2xl font-semibold text-slate-900">
            Upload your file
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Choose a dataset from your file explorer. Once uploaded, it will appear
            in the list below and open in the dataset preview page.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            className="mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={handleChooseFile}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Choose File
          </Button>

          {datasetName ? (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <FileText className="h-4 w-4 text-slate-500" />
              Current dataset: {datasetName}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-[28px] border-slate-200">
        <CardHeader>
          <CardTitle>Uploaded datasets</CardTitle>
          <CardDescription>
            Reopen a previous upload and jump straight to its preview.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {uploadedDatasets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">
              No uploaded datasets yet.
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <p className="truncate font-medium text-slate-900">
                        {dataset.name}
                      </p>
                    </div>

                    <div className="mt-2 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-4 w-4" />
                        <span>
                          {dataset.rows} rows · {dataset.columns} columns
                        </span>
                      </div>

                      <div className="truncate">
                        Sheet: {dataset.sheet || "Default"}
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        <span>{formatDateTime(dataset.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => onOpenUploadedDataset?.(dataset)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
