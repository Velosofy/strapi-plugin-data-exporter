import React, { useEffect, useState } from "react";
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

  const [step, setStep] = useState<1 | 2>(1);
  const [contentTypes, setContentTypes] = useState<ContentTypeMeta[]>([]);
  const [loadingContentTypes, setLoadingContentTypes] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedUID, setSelectedUID] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "xlsx">("csv");

  const t = (key: string) =>
    formatMessage({ id: getTranslation(key), defaultMessage: key });

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
      });

      const { data, filename } = (res as any).data ?? {};
      if (!data) throw new Error("Empty response");

      const mimeType =
        exportFormat === "json"
          ? "application/json;charset=utf-8;"
          : exportFormat === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;";
      const blob = new Blob([atob(data)], { type: mimeType });
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

      {/* Step 1 — Select Content Type */}
      {step === 1 && (
        <Box background="neutral0" shadow="filterShadow" padding={6} hasRadius>
          <Typography variant="delta" tag="h2">
            {t("step.select-content-type.label")}
          </Typography>

          <Box paddingTop={4} style={{ maxWidth: 400 }}>
            {loadingContentTypes ? (
              <Flex justifyContent="center" padding={6}>
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

          <Box paddingTop={6}>
            <Button
              variant="default"
              disabled={!selectedUID}
              onClick={() => setStep(2)}
            >
              {t("button.next")}
            </Button>
          </Box>
        </Box>
      )}

      {/* Step 2 — Select Fields */}
      {step === 2 && selectedContentType && (
        <Box background="neutral0" shadow="filterShadow" padding={6} hasRadius>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            paddingBottom={2}
          >
            <Typography variant="delta" tag="h2">
              {t("step.select-fields.label")}
            </Typography>
            <Button variant="tertiary" size="S" onClick={() => setStep(1)}>
              {t("button.back")}
            </Button>
          </Flex>

          <Box paddingBottom={4}>
            <Typography variant="epsilon" textColor="neutral600">
              {selectedContentType.displayName}
            </Typography>
          </Box>

          {selectedContentType.fields.length === 0 ? (
            <Typography textColor="neutral600">
              {t("empty.no-fields")}
            </Typography>
          ) : (
            <>
              <Flex gap={2} paddingBottom={4}>
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

          <Box paddingTop={6}>
            <Flex gap={3} alignItems="center" direction="column" style={{ alignItems: "flex-start" }}>
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
                  disabled={selectedFields.size === 0 || isExporting}
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
