## 2026-06-24 - Missing Label-Input Association in Shared Components
**Learning:** Shared UI components like `Field` often wrap inputs but fail to propagate `id` for `htmlFor` association, breaking screen reader functionality even when labels are visually present.
**Action:** Always ensure shared form components accept an `id` prop and correctly link the label to the input element.
