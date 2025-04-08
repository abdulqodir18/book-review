// clean-code.js
// This script removes all console.* statements and comments from JS/TS files

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Regex patterns
const consoleRegex = /\bconsole\.(log|warn|error|info|debug)\([^;]*\);?/g;
const singleLineCommentRegex = /(^|[^:])\/\/.*$/gm;
const multiLineCommentRegex = /\/\*[\s\S]*?\*\//gm;

// Target file extensions
const filePatterns = ["**/*.js", "**/*.ts"];

filePatterns.forEach((pattern) => {
  const files = glob.sync(pattern, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"]
  });

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    let cleaned = content
      .replace(multiLineCommentRegex, "")
      .replace(singleLineCommentRegex, "")
      .replace(consoleRegex, "");

    fs.writeFileSync(filePath, cleaned.trim() + "\n", "utf8");
    console.log(`Cleaned: ${filePath}`);
  });
});

console.log("✅ Cleanup complete. All console logs and comments removed.");