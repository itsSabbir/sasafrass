import { describe, expect, it } from "vitest";
import { derivedToText, joinKeysToText, listToText, textToColumnList, textToDerived, textToJoinKeys, textToList } from "./textFields";

describe("text field adapters", () => {
  it("round trips list fields from newlines and commas", () => {
    expect(textToList("a\nb, c")).toEqual(["a", "b", "c"]);
    expect(listToText(["a", "b"])).toBe("a\nb");
  });

  it("parses derived columns", () => {
    const parsed = textToDerived("is_active = status_cd = 'A'");
    expect(parsed).toEqual([{ name: "is_active", expression: "status_cd = 'A'" }]);
    expect(derivedToText(parsed)).toBe("is_active = status_cd = 'A'");
  });

  it("parses join keys", () => {
    const parsed = textToJoinKeys("left.id = right.id");
    expect(parsed).toEqual([{ left: "left.id", right: "right.id" }]);
    expect(joinKeysToText(parsed)).toBe("left.id = right.id");
  });

  it("parses copied SAS and Teradata column definitions into clean column names", () => {
    expect(
      textToColumnList(`
        ACCOUNT_ID num 8 format=best12.
        ORDER_DT date9.
        CUSTOMER_NM char(60) label='Customer'
      `)
    ).toEqual(["ACCOUNT_ID", "ORDER_DT", "CUSTOMER_NM"]);

    expect(
      textToColumnList(`
        CREATE TABLE mart.customer_orders (
          account_id INTEGER NOT NULL,
          revenue_amt DECIMAL(12,2),
          src.customer_segment AS segment_cd
        );
      `)
    ).toEqual(["account_id", "revenue_amt", "segment_cd"]);
  });
});
