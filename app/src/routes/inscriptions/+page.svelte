<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import InscriptionsList from "$lib/components/InscriptionsList.svelte";
  import Editor from "$lib/components/Editor.svelte";
  import OberonChat from "$lib/components/OberonChat.svelte";

  let chatOpen = $state(false);

  onMount(async () => {
    if (settings.vaultPath) {
      await vault.loadInscriptions();
    }
  });

  async function handleSave(markdown: string) {
    await vault.saveCurrentInscription(markdown);
  }
</script>

<div class="inscriptions-layout">
  <div class="inscriptions-main">
    <InscriptionsList />

    <div class="editor-area">
      {#if !settings.vaultPath}
        <div class="no-vault">
          <div class="no-vault-icon">◻</div>
          <h2>No vault configured</h2>
          <p>Set your vault path in Settings to start writing inscriptions.</p>
          <button class="cta-btn" onclick={() => settings.openSettings()}>
            Open Settings →
          </button>
        </div>
      {:else if vault.currentInscription}
        {#key vault.currentInscription.path}
          <Editor
            content={vault.currentContent}
            onSave={handleSave}
            onDirty={() => vault.markDirty()}
            saving={vault.isSaving}
            {chatOpen}
            onToggleChat={() => (chatOpen = !chatOpen)}
          />
        {/key}
      {:else}
        <div class="no-inscription">
          <div class="no-inscription-icon">◻</div>
          <p>Select an inscription or create a new one</p>
          <button class="cta-btn" onclick={() => vault.newInscription()}>
            New inscription +
          </button>
        </div>
      {/if}
    </div>
  </div>

  {#if chatOpen}
    <div class="chat-panel">
      <OberonChat />
    </div>
  {/if}
</div>

<style>
  .inscriptions-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .inscriptions-main {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .chat-panel {
    width: 340px;
    min-width: 340px;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .no-vault,
  .no-inscription {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    text-align: center;
  }

  .no-vault-icon,
  .no-inscription-icon {
    font-size: 40px;
    color: var(--text-dim);
    opacity: 0.5;
  }

  .no-vault h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .no-vault p,
  .no-inscription p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    max-width: 260px;
    line-height: 1.6;
  }

  .cta-btn {
    margin-top: 4px;
    padding: 8px 20px;
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .cta-btn:hover { opacity: 0.9; }
</style>
