import {client} from "@/lib/prisma";

export async function getContracts() {
  return client.contract.findMany({
    include: {
      supplier: true,
      category: true,
      frequency: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
