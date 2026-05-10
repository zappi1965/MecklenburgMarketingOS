
const path = require("path");
const fs = require("fs");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

async function saveLocalFile(file) {
  return {
    provider: "local",
    filename: file.filename,
    path: file.path,
    url: `/uploads/${file.filename}`
  };
}

async function getStorageStatus() {
  return {
    local: true,
    supabaseStorage: !!process.env.SUPABASE_URL,
    s3: !!process.env.S3_BUCKET
  };
}

module.exports = { saveLocalFile, getStorageStatus, LOCAL_UPLOAD_DIR };
