"use client";

import * as React from "react";

interface UseServerPaginationOptions {
  defaultPageSize?: number;
}

export function useServerPagination({
  defaultPageSize = 25,
}: UseServerPaginationOptions = {}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [search, setSearch] = React.useState("");

  const handlePageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleSearchChange = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    search,
    setPage,
    setSearch: handleSearchChange,
    handlePageSizeChange,
  };
}
