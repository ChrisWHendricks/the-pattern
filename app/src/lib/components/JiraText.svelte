<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { settings } from "$lib/stores/settings.svelte";
  import { linkifyHtml } from "$lib/jiraLink";

  let { text, class: className = "" }: { text: string; class?: string } = $props();

  const html = $derived(
    settings.jiraBaseUrl
      ? linkifyHtml(text, settings.jiraBaseUrl, settings.jiraProjects)
      : text,
  );

  function handleClick(e: MouseEvent) {
    const a = (e.target as Element).closest("a");
    if (a) {
      e.preventDefault();
      e.stopPropagation();
      openUrl((a as HTMLAnchorElement).href);
    }
  }
</script>

<span class={className} onclick={handleClick}>{@html html}</span>

<style>
  :global(.jira-link) {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    transition: border-color 0.15s;
  }

  :global(.jira-link:hover) {
    border-bottom-color: var(--accent);
  }
</style>
