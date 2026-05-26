import { describe, expect, it } from "vitest";
import { analyzeSasFile, parseTableRef } from "./sasAnalyzer";

describe("parseTableRef", () => {
  it("parses lib.table", () => {
    expect(parseTableRef("stg.orders")).toEqual({ libref: "stg", table: "orders", fullName: "stg.orders" });
  });

  it("defaults to work library for bare table name", () => {
    expect(parseTableRef("orders")).toEqual({ libref: "work", table: "orders", fullName: "work.orders" });
  });

  it("lowercases and strips quotes", () => {
    expect(parseTableRef("'STG.ORDERS'")).toEqual({ libref: "stg", table: "orders", fullName: "stg.orders" });
  });
});

describe("analyzeSasFile", () => {
  it("extracts DATA step targets and SET sources", () => {
    const sas = `
data work.cleaned;
  set stg.raw_orders;
  where order_date >= '2024-01-01'd;
run;
    `.trim();
    const result = analyzeSasFile(sas);
    expect(result.targetTables).toEqual(
      expect.arrayContaining([expect.objectContaining({ fullName: "work.cleaned" })])
    );
    expect(result.sourceTables).toEqual(
      expect.arrayContaining([expect.objectContaining({ fullName: "stg.raw_orders" })])
    );
  });

  it("extracts PROC SQL FROM and CREATE TABLE", () => {
    const sas = `
proc sql;
  create table work.summary as
  select account_id, sum(revenue) as total_revenue
  from stg.transactions
  group by account_id;
quit;
    `.trim();
    const result = analyzeSasFile(sas);
    expect(result.targetTables).toEqual(
      expect.arrayContaining([expect.objectContaining({ fullName: "work.summary" })])
    );
    expect(result.sourceTables).toEqual(
      expect.arrayContaining([expect.objectContaining({ fullName: "stg.transactions" })])
    );
  });

  it("extracts job name from DIS header", () => {
    const sas = [
      "/***********************************************",
      " * Job: load_fact_orders",
      " * Description: Daily order fact load",
      " ***********************************************/",
      "",
      "data work.orders;",
      "  set stg.raw_orders;",
      "run;"
    ].join("\n");
    const result = analyzeSasFile(sas);
    expect(result.jobName).toBe("load_fact_orders");
    expect(result.description).toBe("Daily order fact load");
  });

  it("returns empty analysis for non-SAS input", () => {
    const result = analyzeSasFile("just some random text");
    expect(result.jobName).toBe("");
    expect(result.steps).toEqual([]);
    expect(result.sourceTables.length).toBeGreaterThanOrEqual(0);
  });
});
