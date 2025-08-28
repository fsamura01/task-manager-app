const crypto = require("crypto");
const fs = require("fs-extra");
// Utility function to calculate file hash for integrity checking
// How To Get The Hash of A File In Node.js
const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
};
module.exports = calculateFileHash;
