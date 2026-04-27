import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { settings } from "$lib/stores/settings.svelte";
import { type Artifact, mimeFromExtension, vaultFileUrl } from "$lib/artifacts";

const STORAGE_KEY = "the_pattern_artifacts";

function fromStorage(): Artifact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function createArtifactsStore() {
  let artifacts = $state<Artifact[]>(fromStorage());
  let importing = $state(false);
  let importError = $state<string | null>(null);

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
  }

  function add(artifact: Artifact) {
    artifacts = [...artifacts, artifact];
    persist();
  }

  function remove(id: string) {
    artifacts = artifacts.filter((a) => a.id !== id);
    persist();
  }

  function link(id: string, inscriptionPath: string) {
    const idx = artifacts.findIndex((a) => a.id === id);
    if (idx === -1) return;
    if (artifacts[idx].linkedPaths.includes(inscriptionPath)) return;
    artifacts[idx] = {
      ...artifacts[idx],
      linkedPaths: [...artifacts[idx].linkedPaths, inscriptionPath],
    };
    artifacts = [...artifacts];
    persist();
  }

  function unlink(id: string, inscriptionPath: string) {
    const idx = artifacts.findIndex((a) => a.id === id);
    if (idx === -1) return;
    artifacts[idx] = {
      ...artifacts[idx],
      linkedPaths: artifacts[idx].linkedPaths.filter((p) => p !== inscriptionPath),
    };
    artifacts = [...artifacts];
    persist();
  }

  function forInscription(inscriptionPath: string): Artifact[] {
    return artifacts.filter((a) => a.linkedPaths.includes(inscriptionPath));
  }

  async function importArtifact(linkedInscriptionPath?: string): Promise<Artifact | null> {
    if (!settings.vaultPath) {
      importError = "No vault configured.";
      return null;
    }

    importing = true;
    importError = null;

    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Documents & Images", extensions: ["pdf", "png", "jpg", "jpeg", "gif", "webp"] },
        ],
      });

      if (!selected) return null;

      const srcPath = selected as string;
      const ext = srcPath.split(".").pop() ?? "bin";
      const id = crypto.randomUUID();
      const storedRelPath = `.pattern/artifacts/${id}.${ext}`;
      const destPath = `${settings.vaultPath}/${storedRelPath}`;

      await invoke("copy_file", { src: srcPath, dest: destPath });

      // Best-effort file size from the source path — not available in browser context,
      // so we store 0 and could update later if needed.
      const filename = srcPath.split("/").pop() ?? srcPath.split("\\").pop() ?? "file";
      const artifact: Artifact = {
        id,
        filename,
        storedPath: storedRelPath,
        mimeType: mimeFromExtension(ext),
        linkedPaths: linkedInscriptionPath ? [linkedInscriptionPath] : [],
        sizeBytes: 0,
        createdAt: new Date().toISOString(),
      };

      add(artifact);
      return artifact;
    } catch (e) {
      importError = e instanceof Error ? e.message : String(e);
      return null;
    } finally {
      importing = false;
    }
  }

  function artifactUrl(artifact: Artifact): string {
    if (!settings.vaultPath) return "";
    const absPath = `${settings.vaultPath}/${artifact.storedPath}`;
    return vaultFileUrl(absPath);
  }

  return {
    get artifacts() { return artifacts; },
    get importing() { return importing; },
    get importError() { return importError; },
    artifactUrl,
    add,
    remove,
    link,
    unlink,
    forInscription,
    importArtifact,
  };
}

export const artifactsStore = createArtifactsStore();
