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
      handler: "controller.export",
      config: {
        policies: [],
        auth: { scope: ["admin"] },
      },
    },
    {
      method: "POST",
      path: "/count",
      handler: "controller.count",
      config: {
        policies: [],
        auth: { scope: ["admin"] },
      },
    },
  ],
};