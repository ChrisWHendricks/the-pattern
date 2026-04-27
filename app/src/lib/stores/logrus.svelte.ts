import { invoke } from "@tauri-apps/api/core";
import { settings } from "$lib/stores/settings.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { artifactsStore } from "$lib/stores/artifacts.svelte";
import { shadowsStore } from "$lib/stores/shadows.svelte";
import { titleToFilename } from "$lib/vault";
import { vaultFileUrl, type Artifact } from "$lib/artifacts";
import { logrusFolder, itemFromPath, type LogrusItem } from "$lib/logrus";

function createLogrusStore() {
  let items = $state<LogrusItem[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function scan() {
    if (!settings.vaultPath) return;
    loading = true;
    error = null;
    try {
      const folder = logrusFolder(settings.vaultPath);
      const paths = await invoke<string[]>("list_dir", { path: folder });
      items = paths.map(itemFromPath).filter((i): i is LogrusItem => i !== null);
    } catch {
      items = [];
    } finally {
      loading = false;
    }
  }

  async function claimAsInscription(
    item: LogrusItem,
    title: string,
    shadowId?: string
  ): Promise<boolean> {
    if (!settings.vaultPath) return false;
    error = null;
    try {
      let content = "";
      try {
        content = await invoke<string>("read_text_file", { path: item.path });
      } catch { /* new empty inscription */ }

      const hasHeader = /^#\s+/m.test(content.trimStart());
      const finalContent = hasHeader ? content : `# ${title}\n\n${content.trim()}`;

      const slug = titleToFilename(title);
      const destPath = `${settings.vaultPath}/${slug}.md`;
      await invoke("write_text_file", { path: destPath, content: finalContent });
      await invoke("delete_file", { path: item.path });
      items = items.filter((i) => i.path !== item.path);

      await vault.loadInscriptions();

      if (shadowId) {
        const inscription = vault.inscriptions.find((i) => i.path === destPath);
        if (inscription) shadowsStore.assign(shadowId, inscription.path);
      }

      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  async function claimAsArtifact(item: LogrusItem, shadowId?: string): Promise<boolean> {
    if (!settings.vaultPath) return false;
    error = null;
    try {
      const id = crypto.randomUUID();
      const storedRelPath = `.pattern/artifacts/${id}.${item.ext}`;
      const destPath = `${settings.vaultPath}/${storedRelPath}`;

      await invoke("copy_file", { src: item.path, dest: destPath });
      await invoke("delete_file", { path: item.path });

      const artifact: Artifact = {
        id,
        filename: item.filename,
        storedPath: storedRelPath,
        mimeType: item.mimeType,
        linkedPaths: [],
        sizeBytes: 0,
        createdAt: new Date().toISOString(),
      };
      artifactsStore.add(artifact);

      if (shadowId) {
        const paths = shadowsStore.getInscriptionPaths(shadowId);
        for (const p of paths) artifactsStore.link(id, p);
      }

      items = items.filter((i) => i.path !== item.path);
      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  async function discard(item: LogrusItem): Promise<boolean> {
    error = null;
    try {
      await invoke("delete_file", { path: item.path });
      items = items.filter((i) => i.path !== item.path);
      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  function itemUrl(item: LogrusItem): string {
    return vaultFileUrl(item.path);
  }

  async function readTextPreview(item: LogrusItem): Promise<string> {
    try {
      return await invoke<string>("read_text_file", { path: item.path });
    } catch {
      return "";
    }
  }

  return {
    get items() { return items; },
    get loading() { return loading; },
    get error() { return error; },
    scan,
    claimAsInscription,
    claimAsArtifact,
    discard,
    itemUrl,
    readTextPreview,
  };
}

export const logrusStore = createLogrusStore();
