# GhostDM Store Listing

## Name

GhostDM

## Short Description

Client-side encryption overlay for Instagram Web DMs.

## Long Description

GhostDM encrypts Instagram Web DM text in your browser before you send it and decrypts GhostDM payloads locally when you view them.

Both people need GhostDM installed and must use the same shared passphrase. GhostDM does not run a server, does not collect personal data, and stores the passphrase only in local browser extension storage.

This is an overlay for Instagram Web, not a replacement for Instagram's native security features. Mobile Instagram and users without GhostDM will see encrypted `ghostdm:v1:` payload text.

## Category

Privacy & Security

## Website

https://github.com/NolanCotter/GhostDM

## Support URL

https://github.com/NolanCotter/GhostDM/issues

## Privacy Policy URL

https://github.com/NolanCotter/GhostDM/blob/main/PRIVACY.md

## Permissions Justification

`storage`: Saves the shared passphrase locally in browser extension storage.

`https://www.instagram.com/*` and `https://instagram.com/*`: Lets the content script add the GhostDM encrypt button and decrypt visible GhostDM payloads on Instagram Web.

## Data Collection Disclosure

GhostDM does not collect or transmit personal data outside the local browser/add-on.

## Submission Packages

Chrome package: `artifacts/ghostdm-chrome.zip`

Firefox package: `artifacts/ghostdm-firefox.zip`

## Screenshot

`store/screenshots/popup-1280x800.png`
