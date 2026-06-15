import { type AnalyzerResult, type Extractor, mergeResults } from "@scatool/analyzer-core";
import { gomodExtractor } from "@scatool/analyzer-plugin-go";
import { gradleExtractor } from "@scatool/analyzer-plugin-gradle";
import { packageJsonExtractor, pnpmLockExtractor } from "@scatool/analyzer-plugin-javascript";
import { mavenExtractor } from "@scatool/analyzer-plugin-maven";
import { resolve } from "node:path";

type ExtractorOptions = Record<string, Record<string, unknown>>;

export interface ExtractSbomOptions {
  ignore?: string[];
  extractorOptions?: ExtractorOptions;
}

const EXTRACTORS: readonly Extractor[] = [
  pnpmLockExtractor,
  packageJsonExtractor,
  gomodExtractor,
  mavenExtractor,
  gradleExtractor,
];

export async function extractSbom(
  codebase: string,
  options: ExtractSbomOptions = {},
): Promise<AnalyzerResult> {
  const codebasePath = resolve(codebase).replaceAll("\\", "/");
  const results: AnalyzerResult[] = [];

  for (const extractor of EXTRACTORS) {
    try {
      results.push(await extractor.extract(codebasePath, extractorOptions(extractor, options)));
    } catch (err) {
      results.push({
        packages: [],
        subprojects: [],
        relationships: [],
        issues: [
          {
            message: `${extractor.name} extractor failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
            severity: "ERROR",
          },
        ],
      });
    }
  }

  return mergeResults(results);
}

function extractorOptions(
  extractor: Extractor,
  options: ExtractSbomOptions,
): Record<string, unknown> {
  const specific = options.extractorOptions?.[extractor.name] ?? {};
  if (!options.ignore || options.ignore.length === 0 || !extractor.optionsSchema) {
    return specific;
  }

  const defaults = extractor.optionsSchema.parse({}) as Record<string, unknown>;
  const defaultIgnore = Array.isArray(defaults.ignore) ? defaults.ignore : [];
  const specificIgnore = Array.isArray(specific.ignore) ? specific.ignore : [];
  return {
    ...specific,
    ignore: [...defaultIgnore, ...specificIgnore, ...options.ignore],
  };
}
