# Mozilla Signing and Persistent Installation

Firefox Release requires Mozilla signing for ordinary persistent installation of self-distributed extensions.

GoreeCloud Redirector uses the fixed Firefox extension ID `redirector@goreecloud.com`. The manifest also declares `data_collection_permissions.required = ["none"]`.

## Preferred release channel

Use **unlisted/self-distributed** signing. This keeps GoreeCloud in control of distribution while still receiving the Mozilla certificate required by Firefox.

## Web upload path

1. Sign in to the Firefox Add-ons Developer Hub with the GoreeCloud Mozilla account.
2. Submit a new add-on and choose self-distribution / "On your own".
3. Upload the release XPI or ZIP produced from this source tree.
4. Complete Mozilla validation/review requirements.
5. Download the Mozilla-signed XPI.
6. Preserve the signed XPI as the release artifact and verify persistent installation through Firefox **Install Add-on From File**.

## Acceptance gate

A signed XPI is not automatically Stable. After signing, verify persistent installation, Firefox restart retention, the built-in redirect, settings persistence, custom permission prompts, UI behavior, expected permissions/data-collection declarations, and exact source version/add-on identity.

Historical local signing used environment-only AMO credentials; reusable signing credentials must never be committed.
