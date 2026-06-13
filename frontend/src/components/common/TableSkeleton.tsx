// TableSkeleton — animated loading placeholder for DataGrid/table areas

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton = ({ rows = 6, columns = 5 }: TableSkeletonProps): JSX.Element => (
  <Box>
    {/* Header row */}
    <Box sx={{ display: 'flex', gap: 2, mb: 1, px: 1 }}>
      {Array.from({ length: columns }).map((_, j) => (
        <Skeleton key={j} variant="text" height={40} sx={{ flex: 1, borderRadius: 1 }} />
      ))}
    </Box>
    {/* Data rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: 'flex', gap: 2, mb: 0.75, px: 1 }}>
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} variant="text" height={36} sx={{ flex: 1, borderRadius: 1 }} />
        ))}
      </Box>
    ))}
  </Box>
);
