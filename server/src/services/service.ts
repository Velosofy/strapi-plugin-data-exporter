import type { Core } from "@strapi/strapi";
import type { Struct, Schema, UID } from "@strapi/types";
import Papa from "papaparse";

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

  async exportCSV(uid: UID.ContentType, fields: string[]): Promise<string> {
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

    while (hasMore) {
      const results = await (strapi.documents(uid) as any).findMany({
        ...(scalarFields.length > 0 ? { fields: scalarFields } : {}),
        ...(relationalFields.length > 0 ? { populate: populateArg } : {}),
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

    const rows: FlatRow[] = allRecords.map((record) => {
      const row: FlatRow = {};
      for (const field of fields) {
        const value = record[field];
        const attrType = attributes[field]?.type;

        if (value === null || value === undefined) {
          row[field] = "";
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

    return Papa.unparse(rows, {
      columns: fields,
      quotes: true,
    });
  },
});

export default service;