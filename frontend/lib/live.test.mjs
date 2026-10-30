/**
 * Tests de `lib/live.ts`, lances par `yarn test` avec le lanceur integre a
 * Node (`node --test`) : pas de dependance a ajouter pour un module pur.
 * Fichier `.mjs` et non `.ts` : TypeScript refuserait l'import `./live.ts`,
 * que Node exige avec son extension.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  facebookEmbedUrl,
  fromLiveInputValue,
  toLiveInputValue,
} from "./live.ts";

describe("lecteur Facebook", () => {
  it("encode le lien de la video dans href", () => {
    const url = new URL(
      facebookEmbedUrl("https://www.facebook.com/futurama.mg/videos/123/"),
    );
    assert.equal(url.pathname, "/plugins/video.php");
    assert.equal(
      url.searchParams.get("href"),
      "https://www.facebook.com/futurama.mg/videos/123/",
    );
    assert.equal(url.searchParams.get("show_text"), "false");
  });
});

describe("heure de Madagascar", () => {
  it("lit la saisie en UTC+3 quel que soit le fuseau de la machine", () => {
    const iso = fromLiveInputValue("2026-10-30T15:00");

    assert.equal(iso, "2026-10-30T12:00:00.000Z");
    assert.equal(toLiveInputValue(iso), "2026-10-30T15:00");
  });
});
