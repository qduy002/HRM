import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  cols: number;
}

export const TableSkeleton = ({ rows = 5, cols }: TableSkeletonProps) => {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + ((c * 7 + r * 3) % 40)}%` }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
};
