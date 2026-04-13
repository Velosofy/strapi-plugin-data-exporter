# strapi-plugin-data-exporter

A **Strapi v5** admin plugin that lets you export any content type's data to a **CSV file** — with full control over which columns to include.

![Strapi v5](https://img.shields.io/badge/Strapi-v5-blueviolet?logo=strapi)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![npm](https://img.shields.io/npm/v/@velosofy/strapi-plugin-data-exporter)

---

## Features

- 📋 **Content type picker** — lists all visible collection types (mirrors the Content Manager)
- ✅ **Column selector** — scalar fields are pre-selected; relational fields are shown but unchecked by default
- 📦 **Full export** — exports every record without pagination limits
- 🔗 **Relations as IDs** — relational / media / component fields are exported as comma-joined `documentId` values
- 🔒 **Admin-only** — all endpoints require an authenticated Strapi admin session
- 💾 **One-click download** — triggers an immediate browser CSV download

---

## Requirements

| Dependency | Version       |
|------------|---------------|
| Strapi     | `^5.0.0`      |
| Node.js    | `>=18.0.0`    |
| React      | `^18.0.0`     |

---

## Installation

```bash
npm install strapi-plugin-data-exporter
# or
yarn add strapi-plugin-data-exporter
```

---

## Configuration

Enable the plugin in your Strapi project's `config/plugins.ts` (or `config/plugins.js`):

```ts
// config/plugins.ts
export default () => ({
  'data-exporter': {
    enabled: true,
  },
});
```

That's it — no additional configuration is required.

---

## Usage

1. Log into the **Strapi Admin Panel**.
2. Click **Data Exporter** in the left-hand sidebar (look for the download icon).
3. **Step 1 — Select content type**: choose a collection type from the dropdown.
4. **Step 2 — Select columns**: all scalar fields are pre-checked. Toggle any columns you want to include/exclude. Relational fields are listed with a `Relation` badge and are unchecked by default.
5. Click **Export CSV** — the file downloads immediately.

---

## CSV format

- All values are quoted
- Headers match the Strapi field names
- Relational, media, component, and dynamic zone fields are exported as comma-separated `documentId` strings (e.g. `abc123,def456`)
- System fields (`id`, `documentId`, `createdAt`, `updatedAt`, `publishedAt`, `createdBy`, `updatedBy`, `locale`, `localizations`) are excluded from the column list

---

## Development

### Local setup

```bash
# Clone the repo
git clone https://github.com/Velosofy/strapi-data-exporter.git
cd strapi-data-exporter

# Install dependencies
npm install

# Build the plugin
npm run build

# Watch mode (rebuilds on file changes)
npm run watch
```

### Linking to a local Strapi project with yalc

```bash
# In the plugin directory — build and push to yalc store
npm run build && npx yalc push

# In your Strapi project — add the local package
npx yalc add data-exporter

# After making changes, push updates from the plugin directory
npx yalc push --changed
# Then in your Strapi project
npx yalc update data-exporter
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/Velosofy/strapi-data-exporter/issues).

---

## License

[MIT](./LICENSE) © [Velosofy](https://github.com/Velosofy)