// src/pages/Home.jsx

export default function Home({ onGoToDashboard }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Decoding Fungal Bioelectric Signals
          </h1>
          <p className="text-base text-xl text-slate-600 max-w-2xl mx-auto text-left">
            This research platform applies modern machine learning techniques
            to the detection, modelling, and prediction of patterns in fungal
            bioelectric signals.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button 
            onClick={onGoToDashboard}
            className="px-10 py-4 bg-emerald-600 hover:bg-emerald-800 
                       text-white font-medium rounded-2xl text-lg">
            Open Dashboard
          </button>

          <button 
            className="px-10 py-4 bg-emerald-600 hover:bg-emerald-800 
                       text-white font-medium rounded-2xl text-lg 
                       flex items-center gap-1">
            Chat with Olive
            <span className="text-2xl">🤖</span>
          </button>
        </div>

        {/* Content Card */}
        <div className="rounded-3xl shadow-xl bg-white p-10 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            What are fungal signals?
          </h2>

          <div className="text-base space-y-8 text-slate-700 leading-relaxed">
            <p>
              Fungi exhibits measurable bioelectric activity. This bioelectric 
              activity - commonly called electrical signals - is recorded as 
              distinct spike-like events or oscillatory patterns that propagate
              along the mycelial network over time.
            </p>

            <p>
              These signals can change in response to external factors such as
              humidity, temperature, or substrate composition. Analysing these
              signals allows researchers to uncover their potential biological
              significance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}