const http = require("http");
http.get("http://localhost:3010/en", (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    const targets = ["Experience the Best of Beauty Treatments", "Sections.title", "Sections.subtitle"];
    for (const t of targets) {
      const idx = data.indexOf(t);
      console.log("\n### " + t + " (first idx " + idx + ", count " + (data.split(t).length - 1) + ")");
      if (idx >= 0) console.log(JSON.stringify(data.slice(Math.max(0, idx - 220), idx + 120)));
    }
  });
}).on("error", (e) => console.log("err", e.message));
