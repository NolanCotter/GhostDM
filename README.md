# GhostDM

Client-side encryption overlay for Instagram Web DMs.

GhostDM does not restore Instagram's native end-to-end encryption. Instead, it encrypts message text before Instagram receives it and decrypts GhostDM payloads locally in the browser.

## MVP

- Chrome Manifest V3 extension
- Instagram Web content script
- Local ECDH key pair
- Public pairing-code exchange
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
2. Copy your public pairing code and send it to the other person.
3. Paste their pairing code into GhostDM and save it.
4. Compare the displayed fingerprints over a second channel if you need to verify identity.
5. On Instagram Web, type a DM and click "Encrypt" before sending.
6. Send the encrypted `ghostdm:v2:` text through Instagram.

## Limitations

- Both users need GhostDM installed.
- Pairing codes are public, but fingerprints should be compared to detect key swaps.
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
