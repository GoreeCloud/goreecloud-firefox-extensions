# Mozilla Signing — GoreeCloud Download Manager Extension

Version 0.2.0 is currently an unsigned source candidate.

The canonical add-on ID is `download-manager@goreecloud.com`. The Linux Native Messaging host manifest must use that same ID in `allowed_extensions` before signed-runtime testing.

A candidate XPI built locally is suitable for `about:debugging` temporary loading. It must not be described as a persistent or Stable Firefox release until Mozilla signing and the GoreeCloud release-acceptance checks complete.

Required promotion checks include exact source-to-package correspondence, Mozilla signing, persistent installation, full Firefox restart, background wake/recovery, queue control, browser-engine downloads, native-host connection, segmented transfer, pause/resume, source-change handling, optional cookie permission behavior, and final download integrity.
