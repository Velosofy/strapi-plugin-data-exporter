import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { useIntl } from "react-intl";
import { useFetchClient } from "@strapi/strapi/admin";
import { getTranslation } from "../utils/getTranslation";
import { PLUGIN_ID } from "../pluginId";

interface FieldMeta {
  name: string;
  type: string;
  isRelational: boolean;
}

interface ContentTypeMeta {
  uid: string;
  displayName: string;
  fields: FieldMeta[];
  hasDraftAndPublish: boolean;
}

interface FilterRule {
  id: number;
  field: string;
  operator: string;
  value: string;
}

type OperatorDef = { label: string; hasValue: boolean };

const OPERATORS_BY_TYPE: Record<string, Record<string, OperatorDef>> = {
  string: {
    $contains:    { label: "contains",        hasValue: true },
    $notContains: { label: "does not contain", hasValue: true },
    $eq:          { label: "equals",           hasValue: true },
    $ne:          { label: "not equals",       hasValue: true },
    $startsWith:  { label: "starts with",      hasValue: true },
    $endsWith:    { label: "ends with",        hasValue: true },
    $null:        { label: "is empty",         hasValue: false },
    $notNull:     { label: "is not empty",     hasValue: false },
  },
  number: {
    $eq:  { label: "=",  hasValue: true },
    $ne:  { label: "≠",  hasValue: true },
    $gt:  { label: ">",  hasValue: true },
    $gte: { label: "≥",  hasValue: true },
    $lt:  { label: "<",  hasValue: true },
    $lte: { label: "≤",  hasValue: true },
    $null:    { label: "is empty",     hasValue: false },
    $notNull: { label: "is not empty", hasValue: false },
  },
  boolean: {
    $eq:  { label: "is true",  hasValue: false },
    $ne:  { label: "is false", hasValue: false },
    $null:    { label: "is empty",     hasValue: false },
    $notNull: { label: "is not empty", hasValue: false },
  },
  date: {
    $eq:  { label: "on",         hasValue: true },
    $lt:  { label: "before",     hasValue: true },
    $lte: { label: "before or on", hasValue: true },
    $gt:  { label: "after",      hasValue: true },
    $gte: { label: "after or on", hasValue: true },
    $null:    { label: "is empty",     hasValue: false },
    $notNull: { label: "is not empty", hasValue: false },
  },
};

const NUMBER_TYPES = new Set(["integer", "biginteger", "decimal", "float"]);
const DATE_TYPES = new Set(["date", "datetime", "time"]);

function getOperatorsForType(type: string): Record<string, OperatorDef> {
  if (NUMBER_TYPES.has(type)) return OPERATORS_BY_TYPE.number;
  if (DATE_TYPES.has(type)) return OPERATORS_BY_TYPE.date;
  if (type === "boolean") return OPERATORS_BY_TYPE.boolean;
  return OPERATORS_BY_TYPE.string;
}

const RELATIONAL_BADGE_MAP: Record<string, string> = {
  relation: "Relation",
  media: "Media",
  component: "Component",
  dynamiczone: "Dynamic Zone",
};

const HomePage = () => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();

  const [contentTypes, setContentTypes] = useState<ContentTypeMeta[]>([]);
  const [loadingContentTypes, setLoadingContentTypes] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedUID, setSelectedUID] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [exportStatus, setExportStatus] = useState<"published" | "draft">("published");

  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const filterIdRef = useRef(0);

  const t = (key: string) =>
    formatMessage({ id: getTranslation(key), defaultMessage: key });

  // Debounced count fetch — runs whenever uid, filters or status change
  const fetchCount = useCallback(async (uid: string, rules: FilterRule[], status: "published" | "draft") => {
    if (!uid) return;
    setCountLoading(true);
    try {
      const res = await post(`/${PLUGIN_ID}/count`, { uid, filters: rules, status });
      setRecordCount((res as any).data?.count ?? 0);
    } catch {
      setRecordCount(null);
    } finally {
      setCountLoading(false);
    }
  }, [post]);

  const countDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedUID) return;
    if (countDebounceRef.current) clearTimeout(countDebounceRef.current);
    countDebounceRef.current = setTimeout(() => fetchCount(selectedUID, filters, exportStatus), 400);
    return () => { if (countDebounceRef.current) clearTimeout(countDebounceRef.current); };
  }, [selectedUID, filters, exportStatus, fetchCount]);

  useEffect(() => {
    const load = async () => {
      setLoadingContentTypes(true);
      setLoadError(null);
      try {
        const res = await get(`/${PLUGIN_ID}/content-types`);
        setContentTypes((res.data as any)?.data ?? []);
      } catch {
        setLoadError(t("error.load-content-types"));
      } finally {
        setLoadingContentTypes(false);
      }
    };
    load();
  }, []);

  const selectedContentType = contentTypes.find((ct) => ct.uid === selectedUID);

  const handleSelectContentType = (uid: string) => {
    setSelectedUID(uid);
    setFilters([]);
    setRecordCount(null);
    setExportStatus("published");
    const ct = contentTypes.find((c) => c.uid === uid);
    if (ct) {
      const defaults = new Set(
        ct.fields.filter((f) => !f.isRelational).map((f) => f.name)
      );
      setSelectedFields(defaults);
    } else {
      setSelectedFields(new Set());
    }
  };

  const toggleField = (name: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedContentType) {
      setSelectedFields(new Set(selectedContentType.fields.map((f) => f.name)));
    }
  };

  const deselectAll = () => {
    setSelectedFields(new Set());
  };

  const addFilter = () => {
    const firstField = selectedContentType?.fields.find((f) => !f.isRelational);
    if (!firstField) return;
    const operators = getOperatorsForType(firstField.type);
    const firstOp = Object.keys(operators)[0];
    filterIdRef.current += 1;
    setFilters((prev) => [
      ...prev,
      { id: filterIdRef.current, field: firstField.name, operator: firstOp, value: "" },
    ]);
  };

  const updateFilter = (id: number, patch: Partial<Omit<FilterRule, "id">>) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...patch };
        // Reset operator when field type changes
        if (patch.field && patch.field !== f.field) {
          const fieldMeta = selectedContentType?.fields.find((fi) => fi.name === patch.field);
          const ops = getOperatorsForType(fieldMeta?.type ?? "string");
          updated.operator = Object.keys(ops)[0];
          updated.value = "";
        }
        // Clear value when operator has no value
        if (patch.operator) {
          const fieldMeta = selectedContentType?.fields.find((fi) => fi.name === updated.field);
          const ops = getOperatorsForType(fieldMeta?.type ?? "string");
          if (!ops[patch.operator]?.hasValue) updated.value = "";
        }
        return updated;
      })
    );
  };

  const removeFilter = (id: number) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const allSelected =
    selectedContentType !== undefined &&
    selectedContentType.fields.length > 0 &&
    selectedContentType.fields.every((f) => selectedFields.has(f.name));

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const res = await post(`/${PLUGIN_ID}/export`, {
        uid: selectedUID,
        fields: Array.from(selectedFields),
        format: exportFormat,
        filters,
        status: exportStatus,
      });

      console.log("Export response", res);

      const { data, filename } = (res as any).data ?? {};
      if (!data) throw new Error("Empty response");

      const mimeType =
        exportFormat === "json"
          ? "application/json;charset=utf-8;"
          : exportFormat === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;";
      // Decode base64 → Uint8Array to preserve binary integrity (critical for XLSX)
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.log("Export error", e);
      setExportError(t("error.export"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box padding={8}>
      {/* Header */}
      <Box paddingBottom={6}>
        <Typography variant="alpha">{t("page.title")}</Typography>
        <Box paddingTop={1}>
          <Typography variant="epsilon" textColor="neutral600">
            {t("page.subtitle")}
          </Typography>
        </Box>
      </Box>

      {loadError && (
        <Box paddingBottom={4}>
          <Alert
            variant="danger"
            title={loadError}
            closeLabel="Close"
            onClose={() => setLoadError(null)}
          >
            {loadError}
          </Alert>
        </Box>
      )}

      {/* Content type selector — always visible */}
      <Box background="neutral0" shadow="filterShadow" padding={6} hasRadius>
        <Flex alignItems="flex-end" gap={4}>
          <Box style={{ maxWidth: 400, flex: 1 }}>
            {loadingContentTypes ? (
              <Flex justifyContent="center" padding={4}>
                <Loader small />
              </Flex>
            ) : contentTypes.length === 0 ? (
              <Typography textColor="neutral600">
                {t("empty.no-content-types")}
              </Typography>
            ) : (
              <Field.Root>
                <Field.Label>{t("field.select-content-type.label")}</Field.Label>
                <SingleSelect
                  placeholder={t("field.select-content-type.placeholder")}
                  value={selectedUID}
                  onChange={(val: any) => handleSelectContentType(String(val))}
                >
                  {contentTypes.map((ct) => (
                    <SingleSelectOption key={ct.uid} value={ct.uid}>
                      {ct.displayName}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            )}
          </Box>
        </Flex>
      </Box>

      {/* Fields, filters & export — shown once a content type is selected */}
      {selectedContentType && (
        <Box background="neutral0" shadow="filterShadow" padding={6} hasRadius marginTop={4}>

          {selectedContentType.fields.length === 0 ? (
            <Typography textColor="neutral600">
              {t("empty.no-fields")}
            </Typography>
          ) : (
            <>
              <Flex gap={2} paddingBottom={4} paddingTop={4}>
                <Button
                  variant="secondary"
                  size="S"
                  onClick={allSelected ? deselectAll : selectAll}
                >
                  {allSelected
                    ? t("fields.deselect-all")
                    : t("fields.select-all")}
                </Button>
              </Flex>

              <Table
                colCount={3}
                rowCount={selectedContentType.fields.length}
              >
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">
                        {t("fields.table.col.include")}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {t("fields.table.col.field")}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {t("fields.table.col.type")}
                      </Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {selectedContentType.fields.map((field) => (
                    <Tr key={field.name}>
                      <Td>
                        <Checkbox
                          checked={selectedFields.has(field.name)}
                          onCheckedChange={() => toggleField(field.name)}
                          aria-label={field.name}
                        />
                      </Td>
                      <Td>
                        <Typography variant="omega">{field.name}</Typography>
                      </Td>
                      <Td>
                        <Flex gap={2} alignItems="center">
                          <Typography variant="omega" textColor="neutral600">
                            {field.type}
                          </Typography>
                          {field.isRelational && (
                            <Badge>
                              {RELATIONAL_BADGE_MAP[field.type] ?? field.type}
                            </Badge>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </>
          )}

          {exportError && (
            <Box paddingTop={4}>
              <Alert
                variant="danger"
                title={exportError}
                closeLabel="Close"
                onClose={() => setExportError(null)}
              >
                {exportError}
              </Alert>
            </Box>
          )}

          {/* Filters */}
          <Box paddingTop={6}>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
              <Typography variant="delta">{t("filters.title")}</Typography>
              <Button variant="secondary" size="S" onClick={addFilter}>
                {t("filters.add")}
              </Button>
            </Flex>

            {filters.length === 0 ? (
              <Typography variant="omega" textColor="neutral500">
                {t("filters.empty")}
              </Typography>
            ) : (
              <Flex direction="column" gap={2}>
                {filters.map((rule) => {
                  const fieldMeta = selectedContentType?.fields.find(
                    (f) => f.name === rule.field
                  );
                  const operators = getOperatorsForType(fieldMeta?.type ?? "string");
                  const opDef = operators[rule.operator];
                  return (
                    <Flex key={rule.id} gap={2} alignItems="flex-end">
                      {/* Field selector */}
                      <Box style={{ minWidth: 160 }}>
                        <Field.Root>
                          <Field.Label>{t("filters.field")}</Field.Label>
                          <SingleSelect
                            value={rule.field}
                            onChange={(val: any) =>
                              updateFilter(rule.id, { field: String(val) })
                            }
                          >
                            {selectedContentType?.fields
                              .filter((f) => !f.isRelational)
                              .map((f) => (
                                <SingleSelectOption key={f.name} value={f.name}>
                                  {f.name}
                                </SingleSelectOption>
                              ))}
                          </SingleSelect>
                        </Field.Root>
                      </Box>

                      {/* Operator selector */}
                      <Box style={{ minWidth: 160 }}>
                        <Field.Root>
                          <Field.Label>{t("filters.operator")}</Field.Label>
                          <SingleSelect
                            value={rule.operator}
                            onChange={(val: any) =>
                              updateFilter(rule.id, { operator: String(val) })
                            }
                          >
                            {Object.entries(operators).map(([key, def]) => (
                              <SingleSelectOption key={key} value={key}>
                                {def.label}
                              </SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Field.Root>
                      </Box>

                      {/* Value input */}
                      {opDef?.hasValue && (
                        <Box style={{ minWidth: 200 }}>
                          <Field.Root>
                            <Field.Label>{t("filters.value")}</Field.Label>
                            <TextInput
                              value={rule.value}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateFilter(rule.id, { value: e.target.value })
                              }
                              placeholder={t("filters.value.placeholder")}
                            />
                          </Field.Root>
                        </Box>
                      )}

                      <Button
                        variant="danger-light"
                        size="S"
                        onClick={() => removeFilter(rule.id)}
                        style={{ marginBottom: 2 }}
                      >
                        {t("filters.remove")}
                      </Button>
                    </Flex>
                  );
                })}
              </Flex>
            )}
          </Box>

          {/* Record count preview */}
          <Box paddingTop={4}>
            <Typography variant="omega" textColor="neutral600">
              {countLoading
                ? t("count.loading")
                : recordCount !== null
                ? `${recordCount} ${t("count.records")}`
                : ""}
            </Typography>
          </Box>

          <Box paddingTop={6}>
            <Flex gap={3} alignItems="center" direction="column" style={{ alignItems: "flex-start" }}>
              {/* Status toggle — only shown for content types with draft & publish */}
              {selectedContentType?.hasDraftAndPublish && (
                <Flex gap={2} alignItems="center">
                  <Typography variant="omega" textColor="neutral600" style={{ marginRight: 4 }}>
                    {t("status.label")}
                  </Typography>
                  <Button
                    variant={exportStatus === "published" ? "default" : "tertiary"}
                    size="S"
                    onClick={() => setExportStatus("published")}
                  >
                    {t("status.published")}
                  </Button>
                  <Button
                    variant={exportStatus === "draft" ? "default" : "tertiary"}
                    size="S"
                    onClick={() => setExportStatus("draft")}
                  >
                    {t("status.draft")}
                  </Button>
                </Flex>
              )}
              <Flex gap={2} alignItems="center">
                <Button
                  variant={exportFormat === "csv" ? "default" : "tertiary"}
                  size="S"
                  onClick={() => setExportFormat("csv")}
                >
                  {t("format.csv")}
                </Button>
                <Button
                  variant={exportFormat === "json" ? "default" : "tertiary"}
                  size="S"
                  onClick={() => setExportFormat("json")}
                >
                  {t("format.json")}
                </Button>
                <Button
                  variant={exportFormat === "xlsx" ? "default" : "tertiary"}
                  size="S"
                  onClick={() => setExportFormat("xlsx")}
                >
                  {t("format.xlsx")}
                </Button>
              </Flex>
              <Flex gap={2} alignItems="center">
                <Button
                  variant="success"
                  disabled={selectedFields.size === 0 || isExporting || recordCount === 0}
                  onClick={handleExport}
                >
                  {isExporting
                    ? t("button.exporting")
                    : exportFormat === "csv"
                    ? t("button.export-csv")
                    : exportFormat === "xlsx"
                    ? t("button.export-xlsx")
                    : t("button.export-json")}
                </Button>
                {isExporting && <Loader small />}
              </Flex>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export { HomePage };
