import Link from "next/link";
import {LuPencil} from "react-icons/lu";

// Enters edit mode by adding ?edit to the current contract route (soft nav — keeps the modal
// mounted when opened from the list, or re-renders the standalone page in place).
export default function EditLink({id}: {id: number}) {
  return (
    <Link
      href={`/expense/fixed/${id}?edit=1`}
      className="border-default hover:bg-default inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm"
    >
      <LuPencil className="size-4"/>
      Edit
    </Link>
  );
}
