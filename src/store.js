const fs = require("fs");
const path = require("path");
const os = require("os");

const LOCAL_DATA_DIR = path.join(__dirname, "..", "data");
const LOCAL_STORE_FILE = path.join(LOCAL_DATA_DIR, "store.json");
const SEED_FILE = path.join(LOCAL_DATA_DIR, "seed.json");

// On Vercel / AWS Lambda serverless functions, the project directory is read-only.
// os.tmpdir() (/tmp) is the only writable directory.
function getStoreFilePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "fashion-store", "store.json");
  }
  return LOCAL_STORE_FILE;
}

let inMemoryStore = null;

function loadInitialData() {
  const storePath = getStoreFilePath();

  // 1. Try to read from storePath (/tmp or local data/)
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read store file:", err.message);
  }

  // 2. Try to read from LOCAL_STORE_FILE if storePath is in /tmp
  if (storePath !== LOCAL_STORE_FILE) {
    try {
      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
  }

  // 3. Fallback to seed.json
  try {
    if (fs.existsSync(SEED_FILE)) {
      const raw = fs.readFileSync(SEED_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Could not read seed.json:", err.message);
  }

  return {
    categories: [],
    products: [],
    users: [],
    carts: {},
    orders: [],
    nextOrderNumber: 1,
  };
}

function readStore() {
  if (!inMemoryStore) {
    inMemoryStore = loadInitialData();
  }
  return inMemoryStore;
}

function writeStore(store) {
  // Always update in-memory cache first so operations immediately reflect in runtime
  inMemoryStore = store;

  // Persist to disk if writable
  try {
    const storePath = getStoreFilePath();
    const dir = path.dirname(storePath);
    fs.mkdirSync(dir, { recursive: true });
    const temporaryFile = `${storePath}.tmp`;
    fs.writeFileSync(
      temporaryFile,
      `${JSON.stringify(store, null, 2)}\n`,
      "utf8",
    );
    fs.renameSync(temporaryFile, storePath);
  } catch (err) {
    // In read-only serverless filesystems, disk write may fail.
    // In-memory store continues to serve requests cleanly without throwing a 500 error.
    console.warn("Persistence write notice (serverless environment):", err.message);
  }
}

module.exports = { readStore, writeStore };
