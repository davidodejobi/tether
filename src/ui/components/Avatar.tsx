import { blobatar } from "blobatar/blob";
import { AVATAR_GEN, type Learner } from "../../storage/progress.ts";
import "./Avatar.css";

/** The learner's static avatar, drawn locally from the saved seed. Decorative: the visible nickname beside it carries the meaning. */
export function Avatar({ learner, size = 48 }: { learner: Pick<Learner, "nickname" | "avatarSeed" | "avatarGen">; size?: number }) {
  let svg: string | null = null;
  try {
    // No animation, no title (decorative). An unknown seed or generation, or a render failure, shows initials.
    if (learner.avatarSeed && learner.avatarGen === AVATAR_GEN) svg = blobatar(learner.avatarSeed, { size, background: "circle" }) || null;
  } catch {}
  const style = `width:${size}px;height:${size}px`;
  return svg ? (
    <span class="avatar" aria-hidden="true" style={style} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <span class="avatar avatar-initials" aria-hidden="true" style={style}>
      {[...learner.nickname.trim()][0]?.toUpperCase() ?? "?"}
    </span>
  );
}

/** Avatar beside the visible nickname (Home and Settings). */
export function Identity({ learner, size }: { learner: Learner; size?: number }) {
  return (
    <p class="identity">
      <Avatar learner={learner} size={size} />
      <span class="identity-name">{learner.nickname}</span>
    </p>
  );
}
