import {redirect} from "next/navigation";

export default function ExpensePage() {
  return (redirect("expense/fixed"));
}
