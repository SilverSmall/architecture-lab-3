import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"];

async function listSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(fullPath));
    } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function importedSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s*)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

async function resolveLocalImport(importer, specifier, knownFiles) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [base, ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
      ...SOURCE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`))];
  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function sourceModule(root, file) {
  const relative = path.relative(path.join(root, "src"), file).split(path.sep);
  return relative.length > 1 ? relative[0] : null;
}

function hasInventoryWrite(source) {
  return [
    /\bdatabase\s*\.\s*stock\s*\.\s*(?:set|delete|clear)\s*\(/,
    /\bdatabase\s*\.\s*stock\s*\[[^\]]+\]\s*=/,
    /\bdatabase\s*\.\s*stock\s*=/,
    /\bdatabase\s*\.\s*stock\s*\.\s*get\s*\([^)]*\)\s*\.\s*available\s*=/,
  ].some((pattern) => pattern.test(source));
}

function findCycles(graph, root) {
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = new Map();

  function visit(file) {
    if (active.has(file)) {
      const start = stack.indexOf(file);
      const cycle = [...stack.slice(start), file];
      const members = cycle.slice(0, -1).map((entry) => path.relative(root, entry)).sort();
      cycles.set(members.join(" -> "), cycle.map((entry) => path.relative(root, entry)));
      return;
    }
    if (visited.has(file)) return;
    visited.add(file);
    active.add(file);
    stack.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    stack.pop();
    active.delete(file);
  }

  for (const file of graph.keys()) visit(file);
  return [...cycles.values()];
}

export async function checkArchitecture(root = process.cwd()) {
  const srcDirectory = path.join(root, "src");
  const files = await listSourceFiles(srcDirectory);
  const knownFiles = new Set(files);
  const graph = new Map(files.map((file) => [file, []]));
  const errors = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relativeFile = path.relative(root, file).split(path.sep).join("/");
    const importerModule = sourceModule(root, file);

    if (/^src\/(?:orders|checkout)\//.test(relativeFile) && hasInventoryWrite(source)) {
      errors.push(`${relativeFile}: Orders/Checkout writes Inventory storage directly.`);
    }

    for (const specifier of importedSpecifiers(source)) {
      const target = await resolveLocalImport(file, specifier, knownFiles);
      if (!target) continue;
      graph.get(file).push(target);

      const targetModule = sourceModule(root, target);
      const targetRelative = path.relative(root, target).split(path.sep).join("/");
      if (
        importerModule && targetModule && importerModule !== targetModule &&
        /(?:^|\/)internal(?:\/|$)/.test(targetRelative)
      ) {
        errors.push(`${relativeFile}: imports another module's internal file ${targetRelative}.`);
      }
    }
  }

  for (const cycle of findCycles(graph, root)) {
    errors.push(`Local import cycle: ${cycle.join(" -> ")}.`);
  }

  return errors;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  try {
    const errors = await checkArchitecture();
    if (errors.length) {
      console.error("Architecture check failed:");
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log("Architecture check passed: no internal leaks, direct stock writes, or local import cycles.");
    }
  } catch (error) {
    console.error(`Architecture check could not scan the source tree: ${error.message}`);
    process.exitCode = 1;
  }
}
