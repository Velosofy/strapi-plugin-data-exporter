# strapi-plugin-data-exporter

A **Strapi v5** admin plugin that lets you export any content type's data to **CSV, JSON, or XLSX** — with full control over which columns to include, per-field filtering, and draft/published status selection.

![Strapi v5](https://img.shields.io/badge/Strapi-v5-blueviolet?logo=strapi)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![npm](https://img.shields.io/npm/v/%40velosofy%2Fstrapi-plugin-data-exporter)

---

## Features

- 📋 **Content type picker** — lists all visible collection types (mirrors the Content Manager)
- ✅ **Column selector** — scalar fields are pre-selected; relational fields are shown but unchecked by default
- 🏷️ **Custom column names** — rename any column header before export; names are auto-prettified (`firstName` → `First Name`) and saved per content type in the browser
- 🔍 **Per-field filters** — filter by any scalar field with type-aware operators (contains, equals, >, <, is empty, etc.)
- 📊 **Multiple export formats** — export as **CSV**, **JSON**, or **XLSX** (Excel)
- 🟢 **Status filter** — for content types with Draft & Publish enabled, choose **Published**, **Draft**, or **All**
- 🔢 **Live record count** — shows how many records match the current filters before you export
- 📦 **Full export** — exports every matching record without pagination limits
- 🔗 **Relations as IDs** — relational / media / component fields are exported as comma-joined `documentId` values
- 🔒 **Admin-only** — all endpoints require an authenticated Strapi admin session
- 💾 **One-click download** — triggers an immediate browser file download

---

## Requirements

| Dependency | Version    |
|------------|------------|
| Strapi     | `^5.0.0`   |
| Node.js    | `>=18.0.0` |
| React      | `^18.0.0`  |

---

## Installation

```bash
npm install @velosofy/strapi-plugin-data-exporter
# or
yarn add @velosofy/strapi-plugin-data-exporter
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
3. **Select a content type** from the dropdown — the field selector and export options appear automatically.
4. **Select columns** — all scalar fields are pre-checked. Toggle any columns you want to include/exclude. Relational fields are listed with a badge and are unchecked by default.
5. *(Optional)* **Rename column headers** — each field has an editable **Column Name** input, pre-filled with a prettified version of the field name (e.g. `createdAt` → `Created At`). Edit any name to customize the header in the exported file. Names are saved per content type in your browser and restored on your next visit. Clearing a name falls back to the original field name.
6. *(Optional)* **Add filters** — click **+ Add Filter** to narrow down records by field value. Operators are typed per field (string, number, date, boolean).
7. *(Optional)* **Select status** — for content types with Draft & Publish, choose **Published**, **Draft**, or **All**. A live record count updates as you adjust filters and status.
8. **Select format** — choose **CSV**, **JSON**, or **XLSX**.
9. Click **Export CSV / Export JSON / Export XLSX** — the file downloads immediately.

---

## Export formats

### CSV
- All values are quoted
- Headers use the custom column name if set, otherwise the Strapi field name
- Relational, media, component, and dynamic zone fields are exported as comma-separated `documentId` strings

### JSON
- Pretty-printed JSON array of objects
- Each object's keys use the custom column name if set, otherwise the Strapi field name
- Relational fields are exported as `documentId` strings (or comma-separated for multi-relations)

### XLSX (Excel)
- Single worksheet named `Export`
- Column headers use the custom column name if set, otherwise the Strapi field name
- Binary-safe download (no encoding prompts)

> System fields (`id`, `documentId`, `createdAt`, `updatedAt`, `publishedAt`, `createdBy`, `updatedBy`, `locale`, `localizations`) are excluded from the column list.

---

## Filtering

Filters are applied per field with type-aware operators:

| Field type        | Available operators                                                              |
|-------------------|----------------------------------------------------------------------------------|
| String / Text     | contains, does not contain, equals, not equals, starts with, ends with, is empty, is not empty |
| Number            | =, not equals, >, >=, <, <=, is empty, is not empty                             |
| Boolean           | is true, is false, is empty, is not empty                                        |
| Date / Datetime   | on, before, before or on, after, after or on, is empty, is not empty             |

Multiple filters are combined with **AND** logic.

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
npx yalc add @velosofy/strapi-plugin-data-exporter

# Watch mode — auto-rebuilds and pushes on file changes
npm run watch:link

# Push updated build to yalc store
npx yalc push --changed
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

## Changelog

### 1.3.0
- Added **custom column names** — rename any export header directly in the UI
- Column names are auto-prettified from field names (`myField` → `My Field`) and saved per content type in the browser (localStorage), restored on next visit
- Clearing a custom name falls back to the original field name in all export formats

### 1.2.0
- `createdAt` is now included as an exportable field (no longer excluded as a system field)

### 1.1.0
- Added **JSON** and **XLSX** export formats
- Added **per-field filter system** with type-aware operators
- Added **Draft / Published / All** status toggle (for content types with Draft & Publish)
- Added **live record count** preview before export
- Simplified UI — content type selector always visible, fields and export options appear inline
- Fixed XLSX binary encoding (no more Excel CSV encoding prompts)
- Fixed draft/published count accuracy using `publishedAt` column

### 1.0.0
- Initial release — CSV export with column selection

---

## License

[MIT](./LICENSE) © [Velosofy](https://github.com/Velosofy)
