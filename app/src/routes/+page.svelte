<script lang="ts">
  import { onMount } from "svelte";
  import OberonChat from "$lib/components/OberonChat.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { issuesStore } from "$lib/stores/issues.svelte";

  onMount(() => {
    if (settings.vaultPath) {
      if (vault.indexSize === 0) vault.loadInscriptions();
      shadowsStore.load();
      issuesStore.load();
    }
  });
</script>

<OberonChat />
