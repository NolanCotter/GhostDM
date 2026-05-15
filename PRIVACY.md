# GhostDM Privacy Policy

Last updated: May 15, 2026

GhostDM is a local browser extension for encrypting Instagram Web DM text before sending it.

## Data Collection

GhostDM does not collect, sell, share, transmit, or remotely store personal data.

## Local Storage

GhostDM stores your local private key and saved peer public key only in the browser extension's local storage so the extension can encrypt and decrypt messages on the same device.

Your private key is not sent to GhostDM servers. GhostDM does not operate a backend service.

## Message Content

Message encryption and decryption happen locally in the browser through the Web Crypto API.

Encrypted message payloads are sent through Instagram only when the user sends them manually. Instagram and Meta may still process message metadata and the encrypted payload text according to their own policies.

## Security Notice

GhostDM does not restore Instagram's native end-to-end encryption and has not been independently audited. Pairing-code fingerprints should be compared out of band before trusting a conversation.

## Contact

For privacy or security questions, open an issue at:

https://github.com/NolanCotter/GhostDM/issues
