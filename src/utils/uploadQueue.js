const MAX_PARALLEL_UPLOADS = 2;

let queue = [];
let activeUploads = 0;

export function addToQueue(task) {
  queue.push(task);
  processQueue();
}

async function processQueue() {
  if (activeUploads >= MAX_PARALLEL_UPLOADS) return;
  if (queue.length === 0) return;

  const task = queue.shift();
  activeUploads++;

  try {
    await task();
  } catch (err) {
    console.error("Upload failed:", err);
  }

  activeUploads--;
  processQueue();
}
