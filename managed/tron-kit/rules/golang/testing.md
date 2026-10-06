---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Testing

> Builds on the shared rules in `../common/testing.md`.

## Style

Table-driven tests with `go test`.

```bash
go test -race ./...
go test -cover ./...
```

Depth: `tron-go` skill (testing reference).
