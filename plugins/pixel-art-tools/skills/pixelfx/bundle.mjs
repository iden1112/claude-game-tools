// pixelfx 모듈들을 하나의 스크립트로 묶는 작은 번들러
import fs from "fs"; import path from "path";
const [root, outFile, ...entries] = process.argv.slice(2);
const mods = new Map(); // abs path -> code
const order = [];
const specs = s => s.split(",").map(x => x.trim()).filter(Boolean).map(x => { const [a, b] = x.split(/\s+as\s+/); return [a.trim(), (b || a).trim()]; });
function load(abs) {
  if (mods.has(abs)) return; mods.set(abs, null);
  let src = fs.readFileSync(abs, "utf8"); const dir = path.dirname(abs);
  const exps = []; const pre = [];
  const R = p => { const r = path.resolve(dir, p); load(r); return JSON.stringify(path.relative(root, r)); };
  src = src.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";?/gm, (_, s, p) => `const {${specs(s).map(([a, b]) => a === b ? a : `${a}: ${b}`).join(", ")}} = __req(${R(p)});`);
  src = src.replace(/^import\s*\*\s*as\s+(\w+)\s+from\s*"([^"]+)";?/gm, (_, n, p) => `const ${n} = __req(${R(p)});`);
  src = src.replace(/^export\s*\*\s*from\s*"([^"]+)";?/gm, (_, p) => { pre.push(`Object.assign(__e, __req(${R(p)}));`); return ""; });
  src = src.replace(/^export\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";?/gm, (_, s, p) => { const k = R(p); for (const [a, b] of specs(s)) exps.push(`get ${b}() { return __req(${k}).${a}; }`); return ""; });
  src = src.replace(/^export\s*\{([\s\S]*?)\};?/gm, (_, s) => { for (const [a, b] of specs(s)) exps.push(`get ${b}() { return ${a}; }`); return ""; });
  src = src.replace(/^export\s+(async\s+function\*?|function\*?|class|const|let|var)\s+(\w+)/gm, (_, kw, n) => { exps.push(`get ${n}() { return ${n}; }`); return `${kw} ${n}`; });
  if (/^\s*(import|export)\s/m.test(src)) throw new Error("leftover import/export in " + abs + ": " + src.match(/^\s*(import|export)\s.*$/m)[0]);
  const id = path.relative(root, abs);
  mods.set(abs, `__def(${JSON.stringify(id)}, function (__e, __req) {\n${pre.join("\n")}\n${src}\nObject.defineProperties(__e, Object.getOwnPropertyDescriptors({${exps.join(",\n")}}));\n});`);
  order.push(abs);
}
for (const e of entries) load(path.resolve(root, e));
const head = `// pixelfx (MIT, https://github.com/patch-gg/pixelfx) — 게임에 필요한 이펙트만 묶음
var PIXELFX = (() => {
const __defs = {}, __cache = {};
function __def(id, f) { __defs[id] = f; }
function __req(id) { if (__cache[id]) return __cache[id]; const e = __cache[id] = {}; __defs[id](e, __req); return e; }
`;
const tail = `\nreturn { core: __req(${JSON.stringify(path.relative(root, path.resolve(root, entries[0])))}), fx: { ${entries.slice(1).map(e => `${JSON.stringify(path.basename(e, ".js"))}: __req(${JSON.stringify(path.relative(root, path.resolve(root, e)))})`).join(", ")} } };\n})();\n`;
fs.writeFileSync(outFile, head + order.map(a => mods.get(a)).join("\n") + tail);
console.log("modules:", order.length, "bytes:", fs.statSync(outFile).size);
