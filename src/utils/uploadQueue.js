const MAX_PARALLEL_UPLOADS = 5;

let queue = [];
let activeUploads = 0;

export function addToQueue(task) {
  queue.push(task);
  window.dispatchEvent(new Event("upload-queued"));
  processQueue();
}

async function processQueue() {
    if (activeUploads >= MAX_PARALLEL_UPLOADS) return;
    if (queue.length === 0) return;

    const task = queue.shift();
    activeUploads++;
    window.dispatchEvent(new Event("upload-started"));
    try {
        await task();
    } catch (err) {
        console.error("Upload failed:", err);
    } finally {
        activeUploads--;
        processQueue();
    }
}
