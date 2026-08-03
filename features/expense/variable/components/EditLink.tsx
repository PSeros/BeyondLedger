import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {LuPencil} from "react-icons/lu";

export default async function EditLink({id}: { id: number }) {
  const t = await getTranslations("common");
  return (
    <Link
      href={`/expense/variable/${id}?edit=1`}
      className="border-default hover:bg-default inline-flex items-center gap-2 rounded-(--radius) border px-3 py-1.5 text-sm"
    >
      <LuPencil className="size-4"/>
      {t("edit")}
    </Link>
  );
}
