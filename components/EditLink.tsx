import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {buttonVariants} from "@heroui/styles";
import {LuPencil} from "react-icons/lu";

// Enters edit mode by adding ?edit to the entity's route (soft nav — keeps the modal mounted when
// opened from the list, or re-renders the standalone page in place). `basePath` is the current
// domain/tab route (e.g. /expense/variable, /expense/fixed, /income/fixed). Icon-only.
//
// It stays a real <Link> (not a HeroUI <Button>, which renders a <button>) so the ?edit soft
// navigation keeps the detail modal mounted; buttonVariants() paints it with HeroUI's own button
// classes so it looks identical to the tertiary icon buttons beside it (delete, view entries).
//
// prefetch={false} is load-bearing (issue #1): in a production build the router prefetches
// `?edit=1`, but a prefetch of a dynamic route only yields the shell — no page data. On click the
// router then treats that entry as a hit, updates the URL to ?edit=1 and never fetches the real
// payload, so the detail view stays on screen until a second click forces a full RSC request.
// Disabling prefetch makes the first click issue that request. Dev doesn't prefetch, hence the
// prod-only symptom.
export default async function EditLink({id, basePath}: {id: number; basePath: string}) {
  const t = await getTranslations("common");
  return (
    <Link
      href={`${basePath}/${id}?edit=1`}
      prefetch={false}
      aria-label={t("edit")}
      title={t("edit")}
      className={buttonVariants({variant: "tertiary", isIconOnly: true, size: "sm"})}
    >
      <LuPencil className="size-4"/>
    </Link>
  );
}
