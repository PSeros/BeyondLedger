import Link from "next/link";
import {LuPencil} from "react-icons/lu";

// Enters edit mode by adding ?edit to the current income route (soft nav — keeps the modal mounted
// when opened from the list, or re-renders the standalone page in place). `basePath` is the current
// tab's route (/income/fixed or /income/variable) so the link stays on the surface it was opened from.
export default function EditLink({id, basePath}: {id: number; basePath: string}) {
  return (
    <Link
      href={`${basePath}/${id}?edit=1`}
      className="border-default hover:bg-default inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm"
    >
      <LuPencil className="size-4"/>
      Edit
    </Link>
  );
}
