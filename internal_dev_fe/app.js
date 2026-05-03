const API_BASE_URL = 'http://localhost:4000';

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadOutput = document.getElementById('uploadOutput');
const loadDatasetsBtn = document.getElementById('loadDatasetsBtn');
const datasetsDiv = document.getElementById('datasets');
const currentJobIdSpan = document.getElementById('currentJobId');
const jobOutput = document.getElementById('jobOutput');
const resultOutput = document.getElementById('resultOutput');

function showJson(el, data) {
  el.textContent = JSON.stringify(data, null, 2);
}

uploadBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) {
    uploadOutput.textContent = 'Choose a file first.';
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  const res = await fetch(`${API_BASE_URL}/datasets/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  showJson(uploadOutput, data);
  await loadDatasets();
});

loadDatasetsBtn.addEventListener('click', loadDatasets);

async function loadDatasets() {
  const res = await fetch(`${API_BASE_URL}/datasets`);
  const datasets = await res.json();

  datasetsDiv.innerHTML = '';
  datasets.forEach((dataset) => {
    const row = document.createElement('div');
    row.style.marginBottom = '12px';

    const text = document.createElement('span');
    text.textContent = `${dataset.name} (${dataset.id}) `;

    const predictBtn = document.createElement('button');
    predictBtn.textContent = 'Predict';
    predictBtn.onclick = () => triggerPrediction(dataset.id);

    row.appendChild(text);
    row.appendChild(predictBtn);
    datasetsDiv.appendChild(row);
  });
}

async function triggerPrediction(datasetId) {
  resultOutput.textContent = '';
  jobOutput.textContent = '';

  const res = await fetch(`${API_BASE_URL}/predict/${datasetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prediction_window: 10 })
  });

  const job = await res.json();
  currentJobIdSpan.textContent = job.id;
  showJson(jobOutput, job);
  pollJob(job.id);
}

async function pollJob(jobId) {
  const interval = setInterval(async () => {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    const job = await res.json();
    showJson(jobOutput, job);

    if (job.status === 'completed') {
      clearInterval(interval);
      await loadResult(job.result_id);
    }

    if (job.status === 'failed') {
      clearInterval(interval);
    }
  }, 1500);
}

async function loadResult(resultId) {
  const res = await fetch(`${API_BASE_URL}/results/${resultId}`);
  const result = await res.json();
  showJson(resultOutput, result);
}

loadDatasets().catch(console.error);
