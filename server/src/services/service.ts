import type { Core } from "@strapi/strapi";
import type { Struct, Schema, UID } from "@strapi/types";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const SYSTEM_FIELDS = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "createdBy",
  "updatedBy",
  "locale",
  "localizations",
]);

const RELATIONAL_TYPES = new Set<Schema.Attribute.Kind>([
  "relation",
  "media",
  "component",
  "dynamiczone",
]);

export interface FieldMeta {
  name: string;
  type: Schema.Attribute.Kind;
  isRelational: boolean;
}

export interface ContentTypeMeta {
  uid: UID.ContentType;
  displayName: string;
  fields: FieldMeta[];
}

type RelationValue =
  | { documentId?: string; id?: string | number }
  | { documentId?: string; id?: string | number }[]
  | null;

type FlatRow = Record<string, string | number | boolean | null>;

export interface FilterRule {
  field: string;
  operator: string;
  value: string;
}

// Map our UI operator keys to Strapi filter operators
const OPERATOR_MAP: Record<string, string> = {
  $eq: "$eq",
  $ne: "$ne",
  $contains: "$containsi",
  $notContains: "$notContainsi",
  $startsWith: "$startsWith",
  $endsWith: "$endsWith",
  $gt: "$gt",
  $gte: "$gte",
  $lt: "$lt",
  $lte: "$lte",
  $null: "$null",
  $notNull: "$notNull",
};

function buildStrapiFilters(
  rules: FilterRule[]
): Record<string, unknown> | undefined {
  if (!rules || rules.length === 0) return undefined;

  const and = rules
    .filter((r) => r.field && r.operator)
    .map((r) => {
      const op = OPERATOR_MAP[r.operator] ?? r.operator;
      if (op === "$null") return { [r.field]: { $null: true } };
      if (op === "$notNull") return { [r.field]: { $null: false } };
      return { [r.field]: { [op]: r.value } };
    });

  return and.length > 0 ? { $and: and } : undefined;
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getContentTypes(): ContentTypeMeta[] {
    return Object.values(strapi.contentTypes)
      .filter(
        (ct): ct is Struct.CollectionTypeSchema =>
          ct.kind === "collectionType" &&
          // Match Content Manager's visibility check:
          // pluginOptions['content-manager'].visible defaults to true if absent
          (ct.pluginOptions?.["content-manager"] as { visible?: boolean } | undefined)
            ?.visible !== false
      )
      .map((ct) => {
        const fields: FieldMeta[] = Object.entries(ct.attributes)
          .filter(([key]) => !SYSTEM_FIELDS.has(key))
          .map(([key, attr]) => ({
            name: key,
            type: attr.type,
            isRelational: RELATIONAL_TYPES.has(attr.type),
          }));

        return {
          uid: ct.uid,
          displayName: ct.info.displayName ?? ct.info.singularName,
          fields,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  async fetchRows(
    uid: UID.ContentType,
    fields: string[],
    filters?: FilterRule[]
  ): Promise<FlatRow[]> {
    const PAGE_SIZE = 200;
    let start = 0;
    let allRecords: Record<string, unknown>[] = [];
    let hasMore = true;

    const ct = strapi.contentTypes[uid];
    const attributes: Struct.SchemaAttributes = ct?.attributes ?? {};

    const scalarFields = fields.filter(
      (f) => !RELATIONAL_TYPES.has(attributes[f]?.type)
    );
    const relationalFields = fields.filter((f) =>
      RELATIONAL_TYPES.has(attributes[f]?.type)
    );

    const populateArg = relationalFields.reduce<Record<string, { fields: string[] }>>(
      (acc, f) => ({ ...acc, [f]: { fields: ["documentId"] } }),
      {}
    );

    const strapiFilters = buildStrapiFilters(filters ?? []);

    while (hasMore) {
      const results = await (strapi.documents(uid) as any).findMany({
        ...(scalarFields.length > 0 ? { fields: scalarFields } : {}),
        ...(relationalFields.length > 0 ? { populate: populateArg } : {}),
        ...(strapiFilters ? { filters: strapiFilters } : {}),
        start,
        limit: PAGE_SIZE,
        status: "published",
      }) as Record<string, unknown>[];

      if (!results || results.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(results);
        hasMore = results.length === PAGE_SIZE;
        start += PAGE_SIZE;
      }
    }

    return allRecords.map((record) => {
      const row: FlatRow = {};
      for (const field of fields) {
        const value = record[field];
        const attrType = attributes[field]?.type;

        if (value === null || value === undefined) {
          row[field] = null;
        } else if (RELATIONAL_TYPES.has(attrType)) {
          const rel = value as RelationValue;
          if (Array.isArray(rel)) {
            row[field] = rel
              .map((v) => v?.documentId ?? v?.id ?? "")
              .join(",");
          } else if (typeof rel === "object" && rel !== null) {
            row[field] = rel.documentId ?? rel.id ?? "";
          } else {
            row[field] = String(value);
          }
        } else {
          row[field] = value as string | number | boolean | null;
        }
      }
      return row;
    });
  },

  async exportCSV(
    uid: UID.ContentType,
    fields: string[],
    filters?: FilterRule[]
  ): Promise<string> {
    const rows = await this.fetchRows(uid, fields, filters);
    const csvRows = rows.map((r) => {
      const out: Record<string, string | number | boolean> = {};
      for (const k of fields) out[k] = r[k] ?? "";
      return out;
    });
    return Papa.unparse(csvRows, { columns: fields, quotes: true });
  },

  async exportJSON(
    uid: UID.ContentType,
    fields: string[],
    filters?: FilterRule[]
  ): Promise<string> {
    const rows = await this.fetchRows(uid, fields, filters);
    return JSON.stringify(rows, null, 2);
  },

  async exportXLSX(
    uid: UID.ContentType,
    fields: string[],
    filters?: FilterRule[]
  ): Promise<Buffer> {
    const rows = await this.fetchRows(uid, fields, filters);
    const xlsxRows = rows.map((r) => {
      const out: Record<string, string | number | boolean> = {};
      for (const k of fields) out[k] = r[k] ?? "";
      return out;
    });
    const worksheet = XLSX.utils.json_to_sheet(xlsxRows, { header: fields });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Uint8Array
    );
  },

  async count(uid: UID.ContentType, filters?: FilterRule[]): Promise<number> {
    const strapiFilters = buildStrapiFilters(filters ?? []);
    return await (strapi.documents(uid) as any).count({
      ...(strapiFilters ? { filters: strapiFilters } : {}),
      status: "published",
    });
  },
});

export default service;