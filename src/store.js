const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const SEED_FILE = path.join(DATA_DIR, "seed.json");

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.copyFileSync(SEED_FILE, STORE_FILE);
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  return JSON.parse(raw);
}

function writeStore(store) {
  ensureStore();
  // Write to a temporary file first so the main JSON file is not left half-written.
  const temporaryFile = `${STORE_FILE}.tmp`;
  fs.writeFileSync(
    temporaryFile,
    `${JSON.stringify(store, null, 2)}\n`,
    "utf8",
  );
  fs.renameSync(temporaryFile, STORE_FILE);
}

module.exports = { readStore, writeStore };
