import { openDB } from 'idb';
import { api } from '../services/api';

const DB_NAME = 'QuickHireProctoringDB';
const STORE_NAME = 'snapshot_queue';

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
};

export const queueSnapshot = async (formData, headers) => {
  try {
    const db = await initDB();
    // Convert FormData to an object to store in IDB
    const entry = {
      blob: formData.get('snapshot'),
      eventType: formData.get('eventType'),
      assessmentType: formData.get('assessmentType'),
      assessmentId: formData.get('assessmentId'),
      attemptId: formData.get('attemptId'),
      sessionId: formData.get('sessionId'),
      timestamp: formData.get('timestamp'),
      eventId: formData.get('eventId'),
      signature: headers['x-proctor-signature'] // Store the signature to replay
    };
    await db.add(STORE_NAME, entry);
  } catch (err) {
    console.error('Failed to queue snapshot', err);
  }
};

export const syncSnapshots = async () => {
  try {
    const db = await initDB();
    const all = await db.getAll(STORE_NAME);
    if (all.length === 0) return;

    for (const item of all) {
      const formData = new FormData();
      if (item.blob) formData.append('snapshot', item.blob, 'snapshot.jpg');
      if (item.eventType) formData.append('eventType', item.eventType);
      if (item.assessmentType) formData.append('assessmentType', item.assessmentType);
      if (item.assessmentId) formData.append('assessmentId', item.assessmentId);
      if (item.attemptId) formData.append('attemptId', item.attemptId);
      if (item.sessionId) formData.append('sessionId', item.sessionId);
      if (item.timestamp) formData.append('timestamp', item.timestamp);
      if (item.eventId) formData.append('eventId', item.eventId);

      try {
        const headers = { 'Content-Type': 'multipart/form-data' };
        if (item.signature) {
          headers['x-proctor-signature'] = item.signature;
        }

        await api.post('/assessment/snapshot', formData, { headers });
        await db.delete(STORE_NAME, item.id);
      } catch (err) {
        // If it's a 4xx error (e.g., attempt expired), we probably shouldn't retry.
        // For now, if it fails, we just break and try again later.
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
            await db.delete(STORE_NAME, item.id);
        } else {
            console.warn('Sync failed for item', item.id, err);
            break;
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync snapshots', err);
  }
};
