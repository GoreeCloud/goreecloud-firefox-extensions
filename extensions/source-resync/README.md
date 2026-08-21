# GoreeCloud Source Resync

GoreeCloud Source Resync is the Firefox extension for manually refreshing resyncable Google Drive sources attached to ChatGPT Projects.

This directory is now the canonical source location for active Firefox development of Source Resync. The former standalone repository, `GoreeCloud/goreecloud-source-resync`, is retained as a legacy migration and history source.

## Included runtime

- Firefox Manifest V3 metadata
- background runtime and local run history
- ChatGPT Project Sources content integration
- Glaze UI-styled floating action and popup interface
- canonical first-party extension icon

## Maintenance

New Source Resync Firefox changes belong in this directory. Release and validation automation should be maintained from the parent `goreecloud-firefox-extensions` repository so that shared extension engineering rules remain consistent across the GoreeCloud extension portfolio.

The legacy repository may remain available for historical reference, but it is no longer the preferred location for new Firefox extension development after this migration is merged.
