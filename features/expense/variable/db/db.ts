import {client} from "@/lib/prisma";

export async function getBills() {
  return client.bill.findMany({
    take: 50, // TODO Just for now
    include: {
      supplier: {
        include: {
          category: true
        },
      },
      items: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
