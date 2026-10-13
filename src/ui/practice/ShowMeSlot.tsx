import { Icon } from "../components/Icon";

// PLACEHOLDER for the free-look Show me playback. Step 9 builds src/ui/help/ShowMe.tsx; swap it in here
// (this is its only use, in Honesty.tsx), keeping the free look recorded with help("showMe").
export function ShowMeSlot() {
  return (
    <div class="hn-showme" role="region" aria-label="Show me">
      <Icon name="play" size={24} />
      <p>Show me plays here</p>
    </div>
  );
}
