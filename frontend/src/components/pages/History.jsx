import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SectionTitle from "@/components/shared/SectionTitle";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

function normaliseStatus(status) {
  return String(status || "unknown").toLowerCase();
}

function isCompleted(job) {
  return normaliseStatus(job?.status) === "completed";
}

function getMongoId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  if (value._id) return getMongoId(value._id);
  return String(value);
}

function getJobId(job) {
  return getMongoId(job?.job_id || job?._id || job?.id) || "—";
}

function getResultId(job) {
  return getMongoId(
    job?.result_id ||
      job?.resultId ||
      job?.result?.result_id ||
      job?.result?.id
  ) || null;
}

function getDatasetName(job) {
  return getMongoId(job?.dataset_id) || "Unknown dataset";
}

function getModelName(job) {
  return (
    job?.request_payload?.model_name ||
    job?.request_payload?.model_used ||
    job?.request_payload?.model_id ||
    job?.request_payload?.model?.name ||
    job?.model_name ||
    job?.modelName ||
    job?.model?.name ||
    job?.model_used ||
    job?.modelUsed ||
    job?.output?.model_used ||
    job?.type ||
    "Model not specified"
  );
}

function getCreatedAt(job) {
  return job?.created_at || job?.createdAt || job?.timestamp || "—";
}

function formatTimestamp(value) {
  if (!value || value === "—") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getStatusBadgeClass(status) {
  const value = normaliseStatus(status);

  if (value === "completed") {
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  }

  if (value === "failed") {
    return "bg-red-100 text-red-700 hover:bg-red-100";
  }

  return "bg-white text-slate-700 border border-slate-200 hover:bg-white";
}

function getSummary(result) {
  return result?.summary || result?.output?.summary || {};
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(4);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ResultCard({ result, job }) {
  const summary = getSummary(result);
  const output = result?.output || {};
  const patterns = output?.patterns || [];
  const predictionWindow = output?.predicted_voltage_window || [];

  const summaryEntries = Object.entries(summary).filter(
    ([key]) => !key.toLowerCase().includes("confidence")
  );

  return (
    <Card className="rounded-3xl">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {result?.type || job?.type || "Result"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Job ID: {getJobId(job) || result?.job_id || "—"}
            </p>
          </div>
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
            {formatTimestamp(result?.created_at || getCreatedAt(job))}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {summaryEntries.length > 0 ? (
            summaryEntries.map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{key}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatValue(value)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              No summary values available.
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Result Details</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p>Dataset: {getDatasetName(job)}</p>
            <p>Model: {output?.model_used || getModelName(job)}</p>
            <p>Patterns: {patterns.length}</p>
            <p>Prediction points: {predictionWindow.length}</p>
            <p>Result ID: {result?.result_id || getResultId(job) || "—"}</p>
            <p>Status: {result?.output?.status || job?.status || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultModal({ title, results, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[86vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Backend result summary and result metadata.</p>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4">
          {results.map(({ result, job }) => (
            <ResultCard key={result?.result_id || getJobId(job)} result={result} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function History({ setPage }) {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [resultCache, setResultCache] = useState({});
  const [resultModal, setResultModal] = useState(null);
  const [compareModal, setCompareModal] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      if (!API_URL) {
        setError("Missing VITE_API_URL.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/jobs`);
        const payload = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(typeof payload === "string" ? payload : payload?.message || "Failed to load jobs.");
        }

        const nextJobs = Array.isArray(payload)
          ? payload
          : payload?.jobs || payload?.data || payload?.results || [];

        if (!cancelled) setJobs(nextJobs);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load jobs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) =>
      [getJobId(job), getDatasetName(job), getModelName(job), job?.status, job?.type]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [jobs, query]);

  const fetchResultForJob = async (job) => {
    const resultId = getResultId(job);
    if (!resultId) throw new Error("This completed job does not have a result_id.");

    if (resultCache[resultId]) return resultCache[resultId];

    let response = await fetch(`${API_URL}/result/${resultId}`);
    let payload = await readJsonResponse(response);

    if (!response.ok && response.status === 404) {
      response = await fetch(`${API_URL}/results/${resultId}`);
      payload = await readJsonResponse(response);
    }

    if (!response.ok) {
      throw new Error(typeof payload === "string" ? payload : payload?.message || "Failed to load result.");
    }

    setResultCache((prev) => ({ ...prev, [resultId]: payload }));
    return payload;
  };

  const openResult = async (job) => {
    try {
      setError("");
      const result = await fetchResultForJob(job);
      setResultModal({ result, job });
    } catch (err) {
      setError(err.message || "Failed to load result.");
    }
  };

  const toggleCompareJob = (job) => {
    if (!isCompleted(job)) return;

    const jobId = getJobId(job);
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const openCompare = async () => {
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(getJobId(job)));

    if (!selectedJobs.length) {
      setError("Select at least one completed job to compare.");
      return;
    }

    try {
      setError("");
      const resultPairs = await Promise.all(
        selectedJobs.map(async (job) => ({ job, result: await fetchResultForJob(job) }))
      );

      setCompareModal(resultPairs);
    } catch (err) {
      setError(err.message || "Failed to load comparison results.");
    }
  };

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Experiment History"
        desc="Track previous runs and compare reproducible workflows."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm rounded-2xl"
          placeholder="Search experiment ID or dataset"
        />
        <Button variant="outline" className="rounded-2xl" onClick={openCompare}>
          Compare selected
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 text-left">Experiment ID</th>
                  <th className="p-4 text-left">Dataset</th>
                  <th className="p-4 text-left">Model</th>
                  <th className="p-4 text-left">Timestamp</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Result</th>
                  <th className="p-4 text-left">Compare</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-t">
                    <td className="p-4 text-slate-500" colSpan={7}>Loading jobs...</td>
                  </tr>
                )}

                {!loading && filteredJobs.length === 0 && (
                  <tr className="border-t">
                    <td className="p-4 text-slate-500" colSpan={7}>No jobs found.</td>
                  </tr>
                )}

                {!loading && filteredJobs.map((job) => {
                  const jobId = getJobId(job);
                  const selected = selectedJobIds.includes(jobId);
                  const completed = isCompleted(job);

                  return (
                    <tr
                      key={jobId}
                      className={`border-t transition ${selected ? "bg-emerald-50" : "bg-white"}`}
                    >
                      <td className="p-4 font-medium">{jobId}</td>
                      <td className="p-4">{getDatasetName(job)}</td>
                      <td className="p-4">{getModelName(job)}</td>
                      <td className="p-4">{formatTimestamp(getCreatedAt(job))}</td>
                      <td className="p-4">
                        <Badge className={getStatusBadgeClass(job?.status)}>{job?.status || "Unknown"}</Badge>
                      </td>
                      <td className="p-4">
                        {completed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => openResult(job)}
                          >
                            Result
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Unavailable</span>
                        )}
                      </td>
                      <td className="p-4">
                        {completed ? (
                          <Button
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className="rounded-xl"
                            onClick={() => toggleCompareJob(job)}
                          >
                            {selected ? "Selected" : "Select"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {resultModal && (
        <ResultModal
          title="Experiment Result"
          results={[resultModal]}
          onClose={() => setResultModal(null)}
        />
      )}

      {compareModal && (
        <ResultModal
          title="Compare Selected Results"
          results={compareModal}
          onClose={() => setCompareModal(null)}
        />
      )}
    </motion.div>
  );
}
