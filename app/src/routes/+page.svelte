<script lang="ts">
  import { onMount } from "svelte";
  import OberonChat from "$lib/components/OberonChat.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";

  onMount(() => {
    if (settings.vaultPath && vault.indexSize === 0) {
      vault.loadInscriptions();
    }
  });
</script>

<OberonChat />
