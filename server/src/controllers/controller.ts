import type { Core } from "@strapi/strapi";
import type { Context, Next } from "koa";

interface ExportRequestBody {
  uid: string;
  fields: string[];
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

  async exportCSV(ctx: Context) {
    const body = ctx.request.body as Partial<ExportRequestBody>;
    const { uid, fields } = body;

    if (!uid || !Array.isArray(fields) || fields.length === 0) {
      ctx.status = 400;
      ctx.body = { error: "uid and fields are required" };
      return;
    }

    try {
      const csv: string = await strapi
        .plugin("data-exporter")
        .service("service")
        .exportCSV(uid, fields);

      const contentTypeName = uid.split(".").pop() ?? "export";
      const filename = `${contentTypeName}-${new Date().toISOString().split("T")[0]}.csv`;

      ctx.body = {
        csv: Buffer.from(csv, "utf-8").toString("base64"),
        filename,
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        error: err instanceof Error ? err.message : "Export failed",
      };
    }
  },
});

export default controller;