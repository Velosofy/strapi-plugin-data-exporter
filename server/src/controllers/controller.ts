import type { Core } from "@strapi/strapi";
import type { Context, Next } from "koa";

type ExportFormat = "csv" | "json" | "xlsx";

interface ExportRequestBody {
  uid: string;
  fields: string[];
  format: ExportFormat;
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  getContentTypes(ctx: Context) {
    try {
      const contentTypes = strapi
        .plugin("data-exporter")
        .service("service")
        .getContentTypes();
      ctx.body = { data: contentTypes };
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        error: err instanceof Error ? err.message : "Failed to fetch content types",
      };
    }
  },

  async export(ctx: Context) {
    const body = ctx.request.body as Partial<ExportRequestBody>;
    const { uid, fields, format = "csv" } = body;

    if (!uid || !Array.isArray(fields) || fields.length === 0) {
      ctx.status = 400;
      ctx.body = { error: "uid and fields are required" };
      return;
    }

    if (format !== "csv" && format !== "json" && format !== "xlsx") {
      ctx.status = 400;
      ctx.body = { error: 'format must be "csv", "json" or "xlsx"' };
      return;
    }

    try {
      const contentTypeName = uid.split(".").pop() ?? "export";
      const date = new Date().toISOString().split("T")[0];

      if (format === "json") {
        const json: string = await strapi
          .plugin("data-exporter")
          .service("service")
          .exportJSON(uid, fields);

        ctx.body = {
          data: Buffer.from(json, "utf-8").toString("base64"),
          filename: `${contentTypeName}-${date}.json`,
          format,
        };
      } else if (format === "xlsx") {
        const xlsxBuffer: Buffer = await strapi
          .plugin("data-exporter")
          .service("service")
          .exportXLSX(uid, fields);

        ctx.body = {
          data: xlsxBuffer.toString("base64"),
          filename: `${contentTypeName}-${date}.xlsx`,
          format,
        };
      } else {
        const csv: string = await strapi
          .plugin("data-exporter")
          .service("service")
          .exportCSV(uid, fields);

        ctx.body = {
          data: Buffer.from(csv, "utf-8").toString("base64"),
          filename: `${contentTypeName}-${date}.csv`,
          format,
        };
      }
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        error: err instanceof Error ? err.message : "Export failed",
      };
    }
  },
});

export default controller;