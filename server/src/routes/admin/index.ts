export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/content-types",
      handler: "controller.getContentTypes",
      config: {
        policies: [],
        auth: {
          scope: ["admin"],
        },
      },
    },
    {
      method: "POST",
      path: "/export",
      handler: "controller.exportCSV",
      config: {
        policies: [],
        auth: {
          scope: ["admin"],
        },
      },
    },
  ],
};