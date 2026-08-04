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
export default async function EditLink({id, basePath}: {id: number; basePath: string}) {
  const t = await getTranslations("common");
  return (
    <Link
      href={`${basePath}/${id}?edit=1`}
      aria-label={t("edit")}
      title={t("edit")}
      className={buttonVariants({variant: "tertiary", isIconOnly: true, size: "sm"})}
    >
      <LuPencil className="size-4"/>
    </Link>
  );
}
