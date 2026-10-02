# @playdeck/receipts

Portable accounts of what a playdeck performance changed.

~~~text
PLAN --projects--> RECEIPT
PERFORMANCE + EVIDENCE --seals--> RECEIPT
SEALED RECEIPT --may inform--> NEXT COMPOSITION
~~~

## Two phases

### projected

A projected receipt is derived from a composition plan.

It records what the plan says *would* happen.

It is inspectable and useful for previews, but it is **not inheritable memory**.

### rendered

A rendered receipt has been explicitly sealed with evidence covering the full performance.

Only rendered receipts with full-performance evidence pass `canInheritReceipt()`.

A hero still or smoke-test frame is checkpoint evidence, not proof that the entire performance occurred.

## Law

~~~text
PLAN != PERFORMANCE
PROJECTION != EVIDENCE
CHECKPOINT != FULL PERFORMANCE
RECEIPT != RENDER
INHERITANCE REQUIRES EVIDENCE
~~~

This distinction is intentional. playdeck should remember what happened, not silently convert what was proposed into history.
