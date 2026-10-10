"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import {parseInsightsQuery, serializeViewQuery} from "@/features/insights/params";

// Server actions for saved Insights views. The query is re-parsed and re-serialized, so only known,
// validated keys are ever stored.

async function cleanName(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    const t = await getTranslations("errors");
    throw new Error(t("nameRequired"));
  }
  return trimmed.slice(0, 80);
}

const canonical = (search: string) => serializeViewQuery(parseInsightsQuery(new URLSearchParams(search)));

export async function createInsightsView(name: string, search: string): Promise<number> {
  const view = await client.insightsView.create({data: {name: await cleanName(name), query: canonical(search)}});
  revalidatePath("/insights");
  return view.id;
}

export async function updateInsightsViewQuery(id: number, search: string): Promise<void> {
  await client.insightsView.update({where: {id}, data: {query: canonical(search)}});
  revalidatePath("/insights");
}

export async function renameInsightsView(id: number, name: string): Promise<void> {
  await client.insightsView.update({where: {id}, data: {name: await cleanName(name)}});
  revalidatePath("/insights");
}

export async function deleteInsightsView(id: number): Promise<void> {
  await client.insightsView.delete({where: {id}});
  revalidatePath("/insights");
}
