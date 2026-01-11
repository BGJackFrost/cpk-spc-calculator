import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PrintableReportProps {
  title: string;
  subtitle?: string;
  companyName?: string;
  companyLogo?: string;
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  pageOrientation?: "portrait" | "landscape";
}

/**
 * PrintableReport - Component tối ưu cho in PDF từ trình duyệt
 * Layout chuẩn A4 (210mm x 297mm)
 * Sử dụng CSS @media print để tối ưu khi in
 */
const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
  (
    {
      title,
      subtitle,
      companyName,
      companyLogo,
      children,
      className,
      showHeader = true,
      showFooter = true,
      pageOrientation = "portrait",
    },
    ref
  ) => {
    const currentDate = new Date().toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        ref={ref}
        className={cn(
          "printable-report bg-white text-black",
          pageOrientation === "landscape" ? "print-landscape" : "print-portrait",
          className
        )}
      >
        {/* Header */}
        {showHeader && (
          <div className="print-header border-b-2 border-gray-300 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {companyLogo && (
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="h-16 w-auto object-contain print-logo"
                  />
                )}
                <div>
                  {companyName && (
                    <p className="text-sm text-gray-600 font-medium">
                      {companyName}
                    </p>
                  )}
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-gray-500">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Ngày xuất: {currentDate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="print-content">{children}</div>

        {/* Footer */}
        {showFooter && (
          <div className="print-footer border-t border-gray-200 pt-4 mt-8 text-center text-xs text-gray-400">
            <p>
              Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator
            </p>
            <p className="mt-1">
              © {new Date().getFullYear()} - {companyName || "MSoftware AI"}
            </p>
          </div>
        )}
      </div>
    );
  }
);

PrintableReport.displayName = "PrintableReport";

/**
 * PrintSection - Tạo section với page break
 */
export function PrintSection({
  title,
  children,
  className,
  pageBreakBefore = false,
  pageBreakAfter = false,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
}) {
  return (
    <div
      className={cn(
        "print-section mb-6",
        pageBreakBefore && "print-page-break-before",
        pageBreakAfter && "print-page-break-after",
        className
      )}
    >
      {title && (
        <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

/**
 * PrintTable - Bảng tối ưu cho in
 */
export function PrintTable({
  headers,
  rows,
  className,
}: {
  headers: string[];
  rows: (string | number | ReactNode)[][];
  className?: string;
}) {
  return (
    <table className={cn("print-table w-full border-collapse text-sm", className)}>
      <thead>
        <tr className="bg-gray-100">
          {headers.map((header, index) => (
            <th
              key={index}
              className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className="border border-gray-300 px-3 py-2 text-gray-600"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * PrintStats - Hiển thị thống kê dạng grid
 */
export function PrintStats({
  stats,
  columns = 4,
  className,
}: {
  stats: { label: string; value: string | number; unit?: string; highlight?: boolean }[];
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "print-stats grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
        className
      )}
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            "border border-gray-200 rounded-lg p-3 text-center",
            stat.highlight && "bg-blue-50 border-blue-300"
          )}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
          <p
            className={cn(
              "text-xl font-bold mt-1",
              stat.highlight ? "text-blue-600" : "text-gray-800"
            )}
          >
            {stat.value}
            {stat.unit && <span className="text-sm font-normal ml-1">{stat.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * PrintChart - Wrapper cho biểu đồ khi in
 */
export function PrintChart({
  title,
  children,
  className,
  height = 300,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div className={cn("print-chart mb-6", className)}>
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      )}
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  );
}

/**
 * Hook để trigger print dialog
 */
export function usePrintReport() {
  const handlePrint = () => {
    window.print();
  };

  return { handlePrint };
}

export default PrintableReport;
