
/*
 * Roomie Secure Transfer V2
 * Development only — not connected to the live app.
 * Uses Web Crypto to generate and separate secrets.
 */
(function () {
  "use strict";

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function encode(bytes) {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function decode(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("Invalid code");
    }
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(
      atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "=")),
      c => c.charCodeAt(0)
    );
  }

  function createCode() {
    if (!crypto?.getRandomValues || !crypto.subtle) {
      throw new Error("Secure browser required");
    }
    return encode(crypto.getRandomValues(new Uint8Array(32)));
  }

  async function derive(code) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(code)) {
      throw new Error("Invalid transfer code");
    }

    const secret = decode(code);
    if (secret.length !== 32 || encode(secret) !== code) {
      throw new Error("Invalid transfer secret");
    }

    const master = await crypto.subtle.importKey(
      "raw", secret, "HKDF", false, ["deriveBits", "deriveKey"]
    );

    const base = {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("Roomie transfer v2")
    };

    const lookup = new Uint8Array(
      await crypto.subtle.deriveBits(
        { ...base, info: encoder.encode("lookup identifier") },
        master,
        128
      )
    );

    const key = await crypto.subtle.deriveKey(
      { ...base, info: encoder.encode("encryption key") },
      master,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    return { id: encode(lookup), key };
  }

  async function encrypt(data, code) {
    const { id, key } = await derive(code);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = encoder.encode(JSON.stringify(data));

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        plaintext
      )
    );

    return {
      id,
      blob: "v2.r." + encode(iv) + "." + encode(ciphertext)
    };
  }

  async function decrypt(blob, code) {
    const { key } = await derive(code);
    const parts = String(blob).split(".");

    if (parts.length !== 4 ||
        parts[0] !== "v2" ||
        parts[1] !== "r") {
      throw new Error("Invalid transfer package");
    }

    const iv = decode(parts[2]);
    if (iv.length !== 12) {
      throw new Error("Invalid encryption nonce");
    }

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      decode(parts[3])
    );

    return JSON.parse(decoder.decode(plaintext));
  }

  window.RoomieTransferV2 = Object.freeze({
    createCode,
    derive,
    encrypt,
    decrypt
  });
})();
