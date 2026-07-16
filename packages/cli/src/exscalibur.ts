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
      results.push(
        await extractor.extract(
          codebasePath,
          options.extractorOptions?.[extractor.name],
          options.ignore ? { ignore: options.ignore } : undefined,
        ),
      );
    } catch (err) {
      results.push({
        packages: [],
        subprojects: [],
        relationships: [],
        issues: [
          {
            code: "extractor-failed",
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
