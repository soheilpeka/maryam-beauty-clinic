const cp = require("child_process");
const https = require("http");
https.get("http://localhost:3010/en", (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    const idx = data.indexOf("Sections.title");
    console.log("occurrences of 'Sections.title':", data.split("Sections.title").length - 1);
    console.log("occurrences of 'Sections.subtitle':", data.split("Sections.subtitle").length - 1);
    if (idx >= 0) {
      console.log("\n--- context around first Sections.title ---");
      console.log(JSON.stringify(data.slice(Math.max(0, idx - 500), idx + 300)));
    }
  });
}).on("error", (e) => console.log("err", e.message));
