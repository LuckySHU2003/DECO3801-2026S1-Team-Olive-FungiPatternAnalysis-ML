import React, { useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SectionTitle from "@/components/shared/SectionTitle";

export default function Upload({ onFileUpload, datasetName }) {
  const fileInputRef = useRef(null);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileUpload(file);
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
        desc="Upload a CSV file from your computer to begin analysis."
      />

      <Card className="rounded-[28px] border-dashed border-2 border-slate-200">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-emerald-50 p-4 text-emerald-600">
            <UploadCloud className="h-10 w-10" />
          </div>

          <h3 className="mt-5 text-2xl font-semibold text-slate-900">
            Upload your file
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Choose a dataset from your file explorer. Once uploaded, you will be
            taken to the dataset preview page.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"            className="hidden"
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
              {datasetName}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}