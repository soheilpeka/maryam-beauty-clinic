const fs = require("fs");
const f = "src/components/booking/booking-flow.tsx";
let b = fs.readFileSync(f);
const reps = [
  [[0xc3,0xa2,0xc2,0x98,0xc2,0x85], [0xe2,0x98,0x85]], // star
  [[0xc3,0xa2,0xc2,0x86,0xc2,0x90], [0xe2,0x86,0x90]], // left arrow
  [[0xc3,0x82,0xc2,0xb7], [0xc2,0xb7]],                // middle dot
];
function find(hay, needle) {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let k = 0; k < needle.length; k++) if (hay[i+k] !== needle[k]) continue outer;
    return i;
  }
  return -1;
}
for (const [from, to] of reps) {
  let n = 0;
  for (;;) {
    const i = find(b, from);
    if (i < 0) break;
    b = Buffer.concat([b.slice(0, i), Buffer.from(to), b.slice(i + from.length)]);
    n++;
  }
  console.log("replaced", n, "x", from.map((x) => x.toString(16)).join(" "), "->", to.map((x) => x.toString(16)).join(" "));
  if (n === 0) { console.error("no match, aborting"); process.exit(1); }
}
fs.writeFileSync(f, b);
// verify
const s = fs.readFileSync(f, "utf8");
let bad = 0;
for (let i = 0; i < s.length; i++) if (s.codePointAt(i) === 0xfffd) bad++;
console.log("done. replacement chars:", bad);
const lines = s.split("\n");
[356, 558, 574, 532].forEach((n) => console.log("L" + n + ":", JSON.stringify(lines[n-1].trim())));
