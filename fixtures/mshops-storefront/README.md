# Sample MSHOPS storefront (CI only)

Pull-request builds cannot read the private MSHOPS repository, so the reusable
build and dry-run workflows set `MSHOPS_STOREFRONT=fixture` and merge this
sanitized stand-in into `dist/app/`. It satisfies the shell contract checked by
`scripts/assemble-operator-dist.mjs` and contains no MSHOPS code or content.

It must never be deployed. It carries
`<meta name="mshops-storefront-fixture" content="true">`, and every deploy job
runs `scripts/ci/assert-real-storefront.mjs`, which fails on that marker.
