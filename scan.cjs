const fs = require("fs"), path = require("path");
function walk(d){let r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(["node_modules",".next",".git","public"].includes(e.name))continue;r=r.concat(walk(p))}else r.push(p)}return r}
const files = walk("src").concat(walk("messages")).concat(walk("prisma")).filter((f)=>/\.(ts|tsx|json|css|prisma)$/.test(f));
function findHay(hay, needle){outer:for(let i=0;i+needle.length<=hay.length;i++){for(let k=0;k<needle.length;k++)if(hay[i+k]!==needle[k])continue outer;return i}return -1}
let issues = 0;
for (const f of files) {
  const b = fs.readFileSync(f);
  for (let i = 0; i < b.length - 1; i++) {
    const c = b[i], d = b[i+1];
    if ((c === 0xc2 || c === 0xc3) && (d === 0xc2 || d === 0xc3)) {
      console.log("DOUBLE-ENC", f, "byte", i, [...b.slice(i,i+6)].map((x)=>x.toString(16)).join(" "));
      issues++;
    }
  }
  const s = b.toString("utf8");
  let rc = 0;
  for (let i = 0; i < s.length; i++) if (s.codePointAt(i) === 0xfffd) rc++;
  if (rc) { console.log("FFFD", f, rc); issues++; }
}
console.log("issues:", issues, "| files scanned:", files.length);
