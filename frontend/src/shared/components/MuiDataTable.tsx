"use client";

import React from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridFooter,
  GridRowParams,
  GridRowSelectionModel,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridValidRowModel,
  gridFilteredSortedRowEntriesSelector,
  useGridApiContext,
} from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { esES } from "@mui/x-data-grid/locales";
import { cn } from "@/shared/lib/utils";

const CAMPOS_SIN_TOTAL = new Set(["acciones", "__check__", "__reorder__"]);

function PieConTotales({
  fields,
  label,
  values,
}: {
  fields: string[];
  label: string;
  values?: Record<string, number>;
}) {
  const apiRef = useGridApiContext();
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const api = apiRef.current;
    if (!api?.subscribeEvent) return undefined;
    const refresh = () => setTick((n) => n + 1);
    const eventos = [
      "filteredRowsSetChange",
      "rowsSet",
      "columnsChange",
      "columnOrderChange",
      "columnVisibilityModelChange",
      "columnResize",
      "columnWidthChange",
    ] as const;
    const unsuscribir = eventos.map((evento) => {
      try {
        return api.subscribeEvent(evento, refresh);
      } catch {
        return () => undefined;
      }
    });
    const raiz = api.rootElementRef?.current;
    const scroller = raiz?.querySelector(".MuiDataGrid-virtualScroller") as HTMLElement | null;
    scroller?.addEventListener("scroll", refresh, { passive: true });
    return () => {
      unsuscribir.forEach((fn) => fn());
      scroller?.removeEventListener("scroll", refresh);
    };
  }, [apiRef]);

  const columnas = apiRef.current?.getVisibleColumns?.() ?? [];
  const scrollLeft = apiRef.current?.getScrollPosition?.()?.left ?? 0;
  let filas: GridValidRowModel[] = [];
  try {
    filas = gridFilteredSortedRowEntriesSelector(apiRef).map((entrada) => entrada.model);
  } catch {
    filas = [];
  }

  const sumas: Record<string, number> = {};
  for (const campo of fields) sumas[campo] = Number(values?.[campo] ?? 0);
  if (!values) {
    for (const campo of fields) sumas[campo] = 0;
    for (const fila of filas) {
      if (fila.__isTotalRow) continue;
      for (const campo of fields) {
        const valor = Number(fila[campo]);
        if (Number.isFinite(valor)) sumas[campo] += valor;
      }
    }
  }

  const filaTotal: GridValidRowModel = { id: "__totales__", __isTotalRow: true, ...sumas };
  const campoEtiqueta = columnas.find(
    (col) => !fields.includes(col.field) && !CAMPOS_SIN_TOTAL.has(col.field),
  )?.field;

  void tick;

  return (
    <>
      <div className="MuiDataGrid-row--total border-t border-border bg-muted/35 font-semibold">
        <div className="overflow-hidden">
          <div className="flex min-h-[48px]" style={{ transform: `translateX(-${scrollLeft}px)` }}>
            {columnas.map((col) => {
              let contenido: React.ReactNode = "";
              if (col.field === campoEtiqueta) {
                contenido = label;
              } else if (fields.includes(col.field)) {
                const valor = filaTotal[col.field];
                if (col.valueFormatter) {
                  contenido = col.valueFormatter(valor, filaTotal, col, apiRef);
                } else if (col.valueGetter) {
                  contenido = col.valueGetter(valor, filaTotal, col, apiRef);
                } else {
                  contenido = valor;
                }
              }
              return (
                <div
                  key={col.field}
                  className="flex items-center px-4 text-sm box-border"
                  style={{
                    width: col.computedWidth,
                    minWidth: col.computedWidth,
                    maxWidth: col.computedWidth,
                  }}
                >
                  {contenido}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <GridFooter />
    </>
  );
}

const theme = createTheme(
  {
    palette: {
      primary: {
        main: "#FF7F50",
        dark: "#E5673A",
      },
    },
    typography: {
      fontFamily: "inherit",
      fontSize: 13,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  },
  esES,
);

function ToolbarColumnas() {
  return (
    <GridToolbarContainer className="px-3 py-2 gap-2">
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
    </GridToolbarContainer>
  );
}

interface MuiDataTableProps {
  columns: GridColDef[];
  rows: GridValidRowModel[];
  loading?: boolean;
  getRowId?: (row: GridValidRowModel) => string | number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  rowCount?: number;
  paginationMode?: "client" | "server";
  autoRowHeight?: boolean;
  checkboxSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
  showAllOption?: boolean;
  className?: string;
  filterMode?: "client" | "server";
  disableColumnFilter?: boolean;
  showToolbar?: boolean;
  storageKey?: string;
  columnVisibilityModel?: GridColumnVisibilityModel;
  onColumnVisibilityModelChange?: (model: GridColumnVisibilityModel) => void;
  mobileHiddenFields?: string[];
  footerTotalFields?: string[];
  footerTotalLabel?: string;
  footerTotalValues?: Record<string, number>;
  getDetailPanelContent?: (params: GridRowParams) => React.ReactNode;
  getDetailPanelHeight?: (params: GridRowParams) => number | "auto";
}

export const MuiDataTable: React.FC<MuiDataTableProps> = ({
  columns,
  rows,
  loading = false,
  getRowId,
  pageSize = 10,
  onPageSizeChange,
  page,
  onPageChange,
  rowCount,
  paginationMode = "server",
  autoRowHeight = false,
  checkboxSelection = false,
  rowSelectionModel,
  onRowSelectionModelChange,
  showAllOption = true,
  className,
  filterMode,
  disableColumnFilter,
  showToolbar = true,
  storageKey,
  columnVisibilityModel,
  onColumnVisibilityModelChange,
  mobileHiddenFields = [],
  footerTotalFields,
  footerTotalLabel = "Totales",
  footerTotalValues,
  getDetailPanelContent,
  getDetailPanelHeight,
}) => {
  const [compacto, setCompacto] = React.useState(false);
  const [paginationModel, setPaginationModel] = React.useState({
    page: page !== undefined ? page : 0,
    pageSize,
  });

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const aplicar = () => setCompacto(media.matches);
    aplicar();
    media.addEventListener("change", aplicar);
    return () => media.removeEventListener("change", aplicar);
  }, []);
  const [visibility, setVisibility] = React.useState<GridColumnVisibilityModel>(() => {
    if (columnVisibilityModel) {
      return columnVisibilityModel;
    }
    if (storageKey && typeof window !== "undefined") {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          return JSON.parse(raw) as GridColumnVisibilityModel;
        } catch {
          return {};
        }
      }
    }
    return {};
  });

  React.useEffect(() => {
    if (page !== undefined) {
      setPaginationModel((prev) => ({ ...prev, page }));
    }
  }, [page]);

  React.useEffect(() => {
    if (pageSize !== undefined) {
      setPaginationModel((prev) => ({ ...prev, pageSize }));
    }
  }, [pageSize]);

  React.useEffect(() => {
    if (columnVisibilityModel) {
      setVisibility(columnVisibilityModel);
    }
  }, [columnVisibilityModel]);

  const handlePaginationModelChange = (model: { page: number; pageSize: number }) => {
    setPaginationModel(model);
    if (onPageChange && model.page !== paginationModel.page) {
      onPageChange(model.page);
    }
    if (onPageSizeChange && model.pageSize !== paginationModel.pageSize) {
      onPageSizeChange(model.pageSize);
    }
  };

  const visibilityEfectiva = React.useMemo(() => {
    if (!compacto || mobileHiddenFields.length === 0) {
      return visibility;
    }
    const siguiente = { ...visibility };
    for (const campo of mobileHiddenFields) {
      if (siguiente[campo] === undefined) {
        siguiente[campo] = false;
      }
    }
    return siguiente;
  }, [compacto, mobileHiddenFields, visibility]);

  const handleVisibilityChange = (model: GridColumnVisibilityModel) => {
    setVisibility(model);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(model));
    }
    onColumnVisibilityModelChange?.(model);
  };

  const FooterSlot = React.useMemo(() => {
    if (!footerTotalFields?.length) return undefined;
    const campos = footerTotalFields;
    const etiqueta = footerTotalLabel;
    const valores = footerTotalValues;
    return function FooterConTotales() {
      return <PieConTotales fields={campos} label={etiqueta} values={valores} />;
    };
  }, [footerTotalFields, footerTotalLabel, footerTotalValues]);

  const allRowsSize = Math.max(rowCount ?? rows.length, rows.length, 1);
  const basePageSizeOptions = [10, 25, 50, 100];
  const pageSizeOptions = showAllOption
    ? [...basePageSizeOptions, ...(allRowsSize > 100 ? [{ value: allRowsSize, label: "TODO" }] : [])]
    : basePageSizeOptions;

  const selectionProps =
    checkboxSelection || rowSelectionModel
      ? {
          checkboxSelection,
          disableRowSelectionExcludeModel: true,
          keepNonExistentRowsSelected: true,
          rowSelectionModel: rowSelectionModel ?? { type: "include" as const, ids: new Set() },
          onRowSelectionModelChange,
        }
      : {};

  return (
    <ThemeProvider theme={theme}>
      <div
        className={cn(
          "w-full min-w-0 flex flex-col flex-1 min-h-[280px] bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden",
          "h-[min(62dvh,650px)] sm:h-[min(64dvh,650px)] lg:h-[min(68dvh,650px)]",
          className,
        )}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density={compacto ? "compact" : "standard"}
          getRowId={getRowId}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={pageSizeOptions}
          disableRowSelectionOnClick
          {...selectionProps}
          autoHeight={false}
          getRowHeight={autoRowHeight ? () => "auto" : undefined}
          getEstimatedRowHeight={autoRowHeight ? () => 64 : undefined}
          pagination
          paginationMode={paginationMode}
          filterMode={filterMode ?? (paginationMode === "client" || Boolean(footerTotalFields?.length) ? "client" : "server")}
          disableColumnFilter={disableColumnFilter}
          rowCount={rowCount}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          showToolbar={showToolbar}
          getRowClassName={(params) => (params.row?.__isTotalRow ? "MuiDataGrid-row--total" : "")}
          isRowSelectable={(params) => !params.row?.__isTotalRow}
          slots={{
            ...(showToolbar ? { toolbar: ToolbarColumnas } : {}),
            ...(FooterSlot ? { footer: FooterSlot } : {}),
          }}
          columnVisibilityModel={visibilityEfectiva}
          onColumnVisibilityModelChange={handleVisibilityChange}
          getDetailPanelContent={getDetailPanelContent}
          getDetailPanelHeight={getDetailPanelHeight ?? (getDetailPanelContent ? () => "auto" : undefined)}
          sx={{
            border: "none",
            flex: 1,
            minHeight: 0,
            color: "hsl(var(--foreground))",
            fontFamily: "inherit",
            "--DataGrid-containerBackground": "hsl(var(--muted)/0.3)",
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "hsl(var(--muted)/0.3)",
              color: "hsl(var(--muted-foreground))",
              fontWeight: "600",
              borderBottom: "1px solid hsl(var(--border))",
              padding: "12px 16px",
              "@media (max-width: 639px)": {
                padding: "8px 10px",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "600",
              textTransform: "uppercase",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid hsl(var(--border)/0.5)",
              padding: "8px 16px",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              color: "hsl(var(--foreground))",
              "@media (max-width: 639px)": {
                padding: "6px 10px",
                fontSize: "0.8125rem",
              },
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "hsl(16 100% 66% / 0.08)",
            },
            "& .MuiDataGrid-row--total": {
              backgroundColor: "hsl(var(--muted)/0.35)",
              fontWeight: 700,
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--muted)/0.1)",
              color: "hsl(var(--muted-foreground))",
              flexWrap: "wrap",
              minHeight: 52,
            },
            "& .MuiTablePagination-toolbar": {
              flexWrap: "wrap",
              paddingLeft: 8,
            },
            "& .MuiTablePagination-root, & .MuiIconButton-root, & .MuiInputBase-root": {
              color: "hsl(var(--muted-foreground))",
            },
            "& .MuiDataGrid-toolbarContainer": {
              borderBottom: "1px solid hsl(var(--border)/0.6)",
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
};
