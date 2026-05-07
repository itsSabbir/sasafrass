import { describe, expect, it } from "vitest";
import { cleanSasCode } from "./index";
import { findMacroEnd } from "./macroBalancer";
import { parseJobHeader, parseStepHeader } from "./headerParser";
import { segment } from "./segmenter";
import fullJobInput from "./__fixtures__/fullJob.input.sas?raw";
import fullJobExpected from "./__fixtures__/fullJob.expected.sas?raw";

describe("findMacroEnd", () => {
  it("finds %mend on the same line for a flat single-line macro", () => {
    const lines = ["%macro foo; %mend;"];
    expect(findMacroEnd(lines, 0)).toBe(0);
  });

  it("finds %mend across multiple lines for a flat macro", () => {
    const lines = ["%macro foo;", "  data x; run;", "%mend foo;"];
    expect(findMacroEnd(lines, 0)).toBe(2);
  });

  it("balances nested macros to the outer %mend", () => {
    const lines = [
      "%macro outer;",
      "%macro inner;",
      "  put 1;",
      "%mend inner;",
      "%mend outer;"
    ];
    expect(findMacroEnd(lines, 0)).toBe(4);
  });

  it("ignores %macro and %mend tokens inside string literals", () => {
    const lines = [
      "%macro foo;",
      "  put '%macro fake; %mend';",
      "%mend foo;"
    ];
    expect(findMacroEnd(lines, 0)).toBe(2);
  });

  it("returns -1 for an unterminated macro", () => {
    const lines = ["%macro foo;", "  data x; run;"];
    expect(findMacroEnd(lines, 0)).toBe(-1);
  });
});

describe("parseJobHeader", () => {
  it("extracts job and description, drops GUIDs and infrastructure metadata", () => {
    const lines = [
      "/****************************************************************************",
      " * Job:             load_fact_cs_attack_opty_to_ord       A51VHQ0T.C9001BYD *",
      " * Description:     daily ETL                                               *",
      " * Metadata Server: CDOPLA-4056.bell.corp.bce.ca                            *",
      " * Port:            8561                                                    *",
      " ****************************************************************************/"
    ];
    expect(parseJobHeader(lines)).toEqual({
      job: "load_fact_cs_attack_opty_to_ord",
      description: "daily ETL"
    });
  });

  it("returns undefined description when the field is empty", () => {
    const lines = [
      "/****************************************************************************",
      " * Job:             my_job                                A51VHQ0T.C9001BYD *",
      " * Description:                                                             *",
      " ****************************************************************************/"
    ];
    expect(parseJobHeader(lines)).toEqual({
      job: "my_job",
      description: undefined
    });
  });
});

describe("parseStepHeader", () => {
  it("extracts step, transform, description, multi-line quick note", () => {
    const lines = [
      "/*==========================================================================*",
      " * Step:            EXT_FACT_TTI_ORD                      A51VHQ0T.CB00FLWF *",
      " * Transform:       Extract                                                 *",
      " * Description:     ext_tti                                                 *",
      " *==========================================================================*",
      " * Quick Note:                                                              *",
      " * 02-Apr-2026                                                              *",
      " * Sabbir Hossain                                                           *",
      " * Extracts TTI order rows.                                                 *",
      " *==========================================================================*/"
    ];
    expect(parseStepHeader(lines)).toEqual({
      step: "EXT_FACT_TTI_ORD",
      transform: "Extract",
      description: "ext_tti",
      quickNote: ["02-Apr-2026", "Sabbir Hossain", "Extracts TTI order rows."],
      warnings: undefined
    });
  });

  it("handles step header without quick note or description", () => {
    const lines = [
      "/*==========================================================================*",
      " * Step:            FOO                                   A51VHQ0T.C9001BYD *",
      " * Transform:       Extract                                                 *",
      " * Description:                                                             *",
      " *==========================================================================*/"
    ];
    expect(parseStepHeader(lines)).toEqual({
      step: "FOO",
      transform: "Extract",
      description: undefined,
      quickNote: undefined,
      warnings: undefined
    });
  });

  it("captures warnings section as separate paragraphs", () => {
    const lines = [
      "/*==========================================================================*",
      " * Step:            FOO                                                     *",
      " * Transform:       Extract                                                 *",
      " *==========================================================================*",
      " * Warnings:                                                                *",
      " * Mapping of the target column ord_num is too short for the specified      *",
      " *  source column ord_num. Values will be truncated.                        *",
      " *==========================================================================*/"
    ];
    expect(parseStepHeader(lines).warnings).toEqual([
      "Mapping of the target column ord_num is too short for the specified",
      "source column ord_num. Values will be truncated."
    ]);
  });
});

describe("segment", () => {
  it("emits a single syslast segment for %let SYSLAST", () => {
    const segments = segment("%let SYSLAST = work.X;");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ kind: "syslast", line: "%let SYSLAST = work.X;" });
    expect(segments[0]).toHaveProperty("inputLineStart", 1);
    expect(segments[0]).toHaveProperty("inputLineEnd", 1);
  });

  it("classifies boilerplate %let names but leaves user lets as code", () => {
    const input = ["%let transformID = %quote(A1);", "%let user_var = 42;"].join("\n");
    const segments = segment(input);
    expect(segments[0].kind).toBe("boilerplateLet");
    expect(segments[1].kind).toBe("code");
  });

  it("collapses an entire %macro etls_recordCheck definition into one boilerplateMacro segment", () => {
    const input = [
      "%macro etls_recordCheck;",
      "  data _null_;",
      "    set work.x;",
      "  run;",
      "  proc datasets lib = work nolist nowarn memtype = (data view);",
      "    delete etls_contents;",
      "  quit;",
      "%mend etls_recordCheck;"
    ].join("\n");
    const segments = segment(input);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("boilerplateMacro");
  });

  it("preserves a non-boilerplate user macro as code", () => {
    const input = ["%macro etls_loader;", "  proc append base=x data=y; run;", "%mend etls_loader;"].join("\n");
    const segments = segment(input);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("code");
  });

  it("detects job and step header banners", () => {
    const input = [
      "/****************************************************************************",
      " * Job:             my_job                                A51VHQ0T.C9001BYD *",
      " ****************************************************************************/",
      "",
      "/*==========================================================================*",
      " * Step:            FOO                                   A51VHQ0T.CB00FLWE *",
      " * Transform:       Extract                                                 *",
      " *==========================================================================*/"
    ].join("\n");
    const segments = segment(input);
    const kinds = segments.map((s) => s.kind);
    expect(kinds).toContain("jobHeader");
    expect(kinds).toContain("stepHeader");
  });

  it("detects pre-step proc datasets cleanup but leaves other proc datasets as code", () => {
    const cleanup = [
      "proc datasets lib = work nolist nowarn memtype = (data view);",
      "   delete EXT_FACT;",
      "quit;"
    ].join("\n");
    const userProc = [
      "proc datasets library=skytdana;",
      "   delete fact_old;",
      "quit;"
    ].join("\n");
    expect(segment(cleanup).map((s) => s.kind)).toEqual(["boilerplateInvocation"]);
    expect(segment(userProc).map((s) => s.kind)).toEqual(["code"]);
  });

  it("strips %perfstrt invocations even when they span multiple lines", () => {
    const input = [
      "%perfstrt(txnname=%BQUOTE(_DISARM|&transformID|&syshostname|Extract),",
      "          metrNam6=_DISROWCNT, metrDef6=Count32);"
    ].join("\n");
    const segments = segment(input);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("boilerplateInvocation");
  });

  it("strips the %perfend data-null teardown block as boilerplate", () => {
    const input = [
      "data _null_;",
      "   if \"&_perfinit\" eq \"1\" then",
      "      call execute('%perfend;');",
      "run;"
    ].join("\n");
    const segments = segment(input);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("boilerplateInvocation");
  });

  it("preserves proc sql blocks and inline user comments as code", () => {
    const input = [
      "proc sql;",
      "   create table work.X as",
      "      /* user comment */",
      "      select * from skytdana.foo;",
      "quit;"
    ].join("\n");
    const segments = segment(input);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("code");
  });

  it("emits a stepEndComment for the /** Step end NAME **/ marker", () => {
    const segments = segment("/** Step end EXT_FACT_TTI_ORD **/");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("stepEndComment");
  });
});

describe("cleanSasCode", () => {
  it("returns empty result for empty input", () => {
    const result = cleanSasCode("");
    expect(result.cleaned).toBe("");
    expect(result.stats).toEqual({
      inputBytes: 0,
      outputBytes: 0,
      inputLines: 0,
      outputLines: 0,
      percentReduction: 0
    });
  });

  it("strips a complete step block to its condensed banner, code, and SYSLAST", () => {
    const input = [
      "/*==========================================================================*",
      " * Step:            EXT_FACT_TTI_ORD                      A51VHQ0T.CB00FLWF *",
      " * Transform:       Extract                                                 *",
      " * Description:     ext_tti                                                 *",
      " *==========================================================================*",
      " * Quick Note:                                                              *",
      " * Extracts TTI order rows.                                                 *",
      " *==========================================================================*/",
      "%let transformID = %quote(A51VHQ0T.CB00FLWF);",
      "%let trans_rc = 0;",
      "%let etls_stepStartTime = %sysfunc(datetime());",
      "%macro etls_recordCheck;",
      "  data _null_; set work.X end=eof; if eof then call symput('etls_recnt', _N_); run;",
      "%mend etls_recordCheck;",
      "%etls_recordCheck;",
      "%let SYSLAST = %nrquote(work.PREVIOUS);",
      "%perfstrt(stepName=EXT, stepID=&transformID);",
      "proc datasets lib = work nolist nowarn memtype = (data view);",
      "  delete EXT_FACT_TTI_ORD;",
      "quit;",
      "proc sql;",
      "  create table work.EXT_FACT_TTI_ORD as select * from skytdana.fact_tti_ord;",
      "quit;",
      "%let SYSLAST = work.EXT_FACT_TTI_ORD;",
      "%perfstop(metrVal6=&etls_recnt);",
      "%let etls_recnt=-1;",
      "/** Step end EXT_FACT_TTI_ORD **/"
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.cleaned).toContain("Step: EXT_FACT_TTI_ORD (Extract) — ext_tti");
    expect(result.cleaned).toContain("Note: Extracts TTI order rows.");
    expect(result.cleaned).toContain("proc sql");
    expect(result.cleaned).toContain("%let SYSLAST = %nrquote(work.PREVIOUS);");
    expect(result.cleaned).toContain("%let SYSLAST = work.EXT_FACT_TTI_ORD;");
    expect(result.cleaned).not.toContain("%let transformID");
    expect(result.cleaned).not.toContain("%macro etls_recordCheck");
    expect(result.cleaned).not.toContain("%perfstrt");
    expect(result.cleaned).not.toContain("/** Step end");
    expect(result.stats.percentReduction).toBeGreaterThan(40);
  });

  it("renders job header with description", () => {
    const input = [
      "/****************************************************************************",
      " * Job:             load_x                                A51VHQ0T.C9001BYD *",
      " * Description:     daily ETL                                               *",
      " ****************************************************************************/"
    ].join("\n");
    expect(cleanSasCode(input).cleaned).toBe("/* Job: load_x — daily ETL */");
  });

  it("is idempotent on already-cleaned output", () => {
    const input = [
      "%let transformID = %quote(X);",
      "proc sql; create table work.X as select 1; quit;",
      "%let SYSLAST = work.X;"
    ].join("\n");
    const once = cleanSasCode(input).cleaned;
    const twice = cleanSasCode(once).cleaned;
    expect(twice).toBe(once);
  });

  it("computes stats with rounded percent reduction", () => {
    const input = "%let etls_recnt = 0;\nproc sql; quit;";
    const result = cleanSasCode(input);
    expect(result.stats.inputBytes).toBe(input.length);
    expect(result.stats.outputBytes).toBe(result.cleaned.length);
    expect(result.stats.percentReduction).toBeGreaterThan(0);
    expect(result.stats.percentReduction).toBeLessThanOrEqual(100);
  });

  it("matches the golden fullJob fixture and reduces by at least 50%", () => {
    const result = cleanSasCode(fullJobInput);
    expect(result.cleaned).toBe(fullJobExpected.replace(/\r\n/g, "\n").replace(/\s+$/, ""));
    expect(result.stats.percentReduction).toBeGreaterThanOrEqual(50);
  });
});

describe("cleanSasCode — false-positive stripping protection (Phase 1 hardening)", () => {
  it("does NOT strip a user comment that starts with the boilerplate phrase 'Runtime statistics macros'", () => {
    const input = [
      "/* Runtime statistics macros — added by Sabbir to track per-step timing */",
      "proc sql; create table work.X as select 1 as a; quit;"
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.cleaned).toContain("added by Sabbir");
    expect(result.cleaned).toContain("proc sql");
  });

  it("does NOT strip a user comment that extends the canonical 'Access the data for X' phrase", () => {
    const input = [
      "/* Access the data for SRCDB — note: requires AUTHDOMAIN=tdprod */",
      "LIBNAME srcdb TERADATA SERVER=\"src.example.com\" SCHEMA=PUBLIC;"
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.cleaned).toContain("requires AUTHDOMAIN=tdprod");
    expect(result.cleaned).toContain("LIBNAME srcdb");
  });

  it("DOES strip the canonical DIS noise comments verbatim", () => {
    const input = [
      "/* Runtime statistics macros  */",
      "/* Access the data for SRCDB  */",
      "LIBNAME srcdb TERADATA SERVER=\"src.example.com\" SCHEMA=PUBLIC;"
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.cleaned).not.toContain("Runtime statistics macros");
    expect(result.cleaned).not.toContain("Access the data for");
    expect(result.cleaned).toContain("LIBNAME srcdb");
  });

  it("does NOT strip a user comment that adds context after 'Map the columns'", () => {
    const input = [
      "/*---- Map the columns — see Confluence page for mapping rationale ----*/",
      "proc sql; create table work.X as select 1 as a; quit;"
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.cleaned).toContain("Confluence page");
  });
});

describe("cleanSasCode — audit trail (removed segments)", () => {
  it("populates `removed` with one entry per stripped segment, carrying input line ranges", () => {
    const input = [
      "%let transformID = %quote(A);", // line 1: boilerplateLet
      "%macro etls_recordCheck;",       // line 2-4: boilerplateMacro
      "  data _null_; run;",            //
      "%mend etls_recordCheck;",        //
      "%etls_recordCheck;",             // line 5: boilerplateInvocation
      "proc sql; quit;",                // line 6: code (kept)
      "/** Step end FOO **/"            // line 7: stepEndComment
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.removed.length).toBeGreaterThanOrEqual(4);
    const categories = result.removed.map((r) => r.category);
    expect(categories).toContain("boilerplateLet");
    expect(categories).toContain("boilerplateMacro");
    expect(categories).toContain("boilerplateInvocation");
    expect(categories).toContain("stepEndComment");
    for (const r of result.removed) {
      expect(r.inputLineStart).toBeGreaterThanOrEqual(1);
      expect(r.inputLineEnd).toBeGreaterThanOrEqual(r.inputLineStart);
      expect(r.text.length).toBeGreaterThan(0);
    }
    const macroEntry = result.removed.find((r) => r.category === "boilerplateMacro");
    expect(macroEntry?.name).toBe("etls_recordCheck");
  });

  it("returns an empty `removed` array when input has no boilerplate", () => {
    const result = cleanSasCode("proc sql; create table work.X as select 1 as a; quit;");
    expect(result.removed).toEqual([]);
  });

  it("groups multi-line boilerplate macros into a single removed entry with the correct line range", () => {
    const input = [
      "%macro etls_recordCheck;",   // line 1
      "  data _null_; run;",         // line 2
      "%mend etls_recordCheck;"      // line 3
    ].join("\n");
    const result = cleanSasCode(input);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]).toMatchObject({
      category: "boilerplateMacro",
      name: "etls_recordCheck",
      inputLineStart: 1,
      inputLineEnd: 3
    });
  });
});
