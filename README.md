# GhostDM

Client-side encryption overlay for Instagram Web DMs.

GhostDM does not restore Instagram's native end-to-end encryption. Instead, it encrypts message text before Instagram receives it and decrypts GhostDM payloads locally in the browser.

## MVP

- Chrome Manifest V3 extension
- Instagram Web content script
- Local shared passphrase
- AES-GCM encryption through Web Crypto
- Manual "Encrypt" button
- Ctrl/Cmd + Shift + E shortcut while the DM composer is focused
- Auto-decrypt visible GhostDM messages

## Install Locally

```bash
npm install
npm run build
```

Chrome: open `chrome://extensions`, enable developer mode, choose "Load unpacked", and select `dist`.

Firefox: open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `dist-firefox/manifest.json`.

## Use

1. Open the GhostDM extension popup.
2. Save the same shared passphrase on both browsers.
3. On Instagram Web, type a DM and click "Encrypt" before sending.
4. Send the encrypted `ghostdm:v1:` text through Instagram.

## Limitations

- Both users need GhostDM installed.
- Mobile Instagram will show encrypted payloads.
- Metadata is not hidden.
- Attachments are not encrypted yet.
- DOM selectors may break when Instagram changes its UI.
- This is not audited security software.

## Privacy

GhostDM does not operate a backend service and does not collect or transmit personal data outside the local browser/add-on. See [PRIVACY.md](PRIVACY.md).

## Dev

```bash
npm install
npm run check
npm run build:chrome
npm run build:firefox
npm run package
```

`npm run package` writes `artifacts/ghostdm-chrome.zip` and `artifacts/ghostdm-firefox.zip`.
