const HORIZON = 7 * 86400000;
const config = {
  apiKey: 'AIzaSyDfnuR07pt2IIWCScmI7H4aSy57XIHZpHg',
  authDomain: 'rivalcoin-738cc.firebaseapp.com',
  projectId: 'rivalcoin-738cc',
  storageBucket: 'rivalcoin-738cc.firebasestorage.app',
  messagingSenderId: '53292984166',
  appId: '1:53292984166:web:63d508b16bb8c04affcaa7'
};

function accountId(telegram) {
  const person = telegram?.initDataUnsafe?.user?.id;
  if (person) {
    try { sessionStorage.setItem('rival_session_uid',String(person)); } catch { /* Optional storage. */ }
    return String(person);
  }
  try {
    const session = sessionStorage.getItem('rival_session_uid');
    if (/^\d{1,20}$/.test(session ?? '')) return session;
    const demo = localStorage.getItem('rival_demo_uid');
    if (/^demo_\d+$/.test(demo ?? '')) return demo;
  } catch { /* Standalone play does not need storage. */ }
  return '';
}

export function createWallet(telegram, notify, background = true) {
  const uid = accountId(telegram);
  const prefix = 'rival_runner_reward_' + uid + '_';
  const recordKey = 'runner_best_distance_' + (uid || 'local');
  const pending = new Map();
  const written = new Map();
  let connection, syncing = false, failed = false, storageFailed = false;
  let record = 0;
  try { record = Number(localStorage.getItem(recordKey) ?? localStorage.getItem('runner_best_distance')) || 0; }
  catch { /* Record remains available for this session. */ }

  function keepBest(distance) {
    if (distance <= record) return false;
    record = distance;
    try { localStorage.setItem(recordKey,String(distance)); } catch { /* Optional storage. */ }
    return true;
  }

  function snapshotQueue() {
    const result = new Map(pending);
    const cutoff = Date.now() - HORIZON;
    try {
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(prefix)) continue;
        const run = JSON.parse(localStorage.getItem(key));
        if (!run || key !== prefix + run.id) continue;
        if (run.at < cutoff) { localStorage.removeItem(key); continue; }
        if (!result.has(run.id) || run.bonus) result.set(run.id,run);
      }
    } catch { /* Use the in-memory queue. */ }
    return [...result.values()].filter(run => /^[-a-f\d]{36}$/.test(run.id) && run.at >= cutoff &&
      Number.isSafeInteger(run.coins) && run.coins >= 0 && Number.isSafeInteger(run.distance) && run.distance >= 0);
  }

  async function getConnection() {
    connection ??= Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
    ]).then(([app, store]) => {
      const db = store.getFirestore(app.initializeApp(config));
      return { store, db, ref: store.doc(db,'users',uid) };
    });
    return connection;
  }

  async function flush(checkRecord = false) {
    if (!uid || syncing) return;
    const queue = snapshotQueue();
    if (!queue.length && !checkRecord) return;
    syncing = true;
    try {
      const { store, db, ref } = await getConnection();
      const result = await store.runTransaction(db,async transaction => {
        const snapshot = await transaction.get(ref);
        const cloud = snapshot.data() ?? {};
        const original = cloud.runnerReceipts ?? {};
        const cutoff = Date.now() - HORIZON;
        const receipts = Object.fromEntries(Object.entries(original).filter(([,value]) => value?.at >= cutoff));
        let balance = Number(cloud.balance) || 0;
        let best = Number(cloud.runnerBest) || 0;
        let runs = Number(cloud.runnerRuns) || 0;
        for (const run of queue) {
          const previous = receipts[run.id];
          if (!previous) {
            runs++;
            balance += run.coins;
            best = Math.max(best,run.distance);
          }
          if (run.bonus && !previous?.bonus) balance += run.coins;
          receipts[run.id] = { at: run.at, bonus: Boolean(run.bonus || previous?.bonus) };
        }
        if (queue.length) {
          const patch = { balance, runnerBest: best, runnerRuns: runs, runnerReceipts: receipts };
          if (snapshot.exists()) transaction.update(ref,patch);
          else transaction.set(ref,patch);
        }
        return { best, receipts };
      });
      failed = false;
      keepBest(result.best);
      for (const run of queue) {
        const receipt = result.receipts[run.id];
        written.set(run.id,receipt);
        if (!pending.get(run.id)?.bonus || receipt.bonus) pending.delete(run.id);
        try {
          const key = prefix + run.id;
          const current = JSON.parse(localStorage.getItem(key));
          if (current && (!current.bonus || receipt.bonus)) localStorage.removeItem(key);
        } catch { /* The receipt makes replay safe. */ }
      }
    } catch (error) {
      failed = true;
      console.warn('Subway Runner sync:',error);
    } finally {
      syncing = false;
      notify();
    }
  }

  function enqueue(run) {
    if (!uid) return;
    pending.set(run.id,{...run});
    try { localStorage.setItem(prefix + run.id,JSON.stringify(run)); }
    catch { storageFailed = true; }
    void flush();
  }

  if (background) {
    window.addEventListener('online',() => void flush(true));
    setInterval(() => { if (!document.hidden) void flush(); },4000);
    void flush(true);
  }
  return {
    connected: Boolean(uid), keepBest, enqueue, flush,
    get record() { return record; },
    receipt: id => written.get(id),
    get failed() { return failed; },
    get storageFailed() { return storageFailed; }
  };
}
