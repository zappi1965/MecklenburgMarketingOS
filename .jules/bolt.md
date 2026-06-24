## 2025-05-14 - [Inefficient filtering in shared library]
**Learning:** The `matchesCustomer` function in `v44FunctionalToolsClient.ts` was using array allocations and `.filter().some()` inside a tight loop during data filtering for dashboards. This caused significant GC pressure and CPU overhead when processing large data sets (~90k records).
**Action:** Replace array-based checks with direct property comparisons in `matchesCustomer` to improve filtering performance by ~60%.
