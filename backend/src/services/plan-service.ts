import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItineraryPlan, StoredTravelPlan, TravelPreferences } from "../types/travel";
import { getSupabaseAdmin } from "./supabase-client";

const TABLE_NAME = "travel_plans";

function ensureSupabase(): SupabaseClient {
  return getSupabaseAdmin();
}

function mapRow(row: any): StoredTravelPlan {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? row.plan?.title ?? "",
    overview: row.overview ?? row.plan?.overview ?? "",
    plan: row.plan as ItineraryPlan,
    preferences: row.preferences as TravelPreferences,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listPlans(userId: string): Promise<StoredTravelPlan[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`查询行程失败: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function createPlan(
  userId: string,
  plan: ItineraryPlan,
  preferences: TravelPreferences
): Promise<StoredTravelPlan> {
  const supabase = ensureSupabase();
  const payload = {
    user_id: userId,
    title: plan.title,
    overview: plan.overview,
    plan,
    preferences
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`保存行程失败: ${error?.message ?? "未知错误"}`);
  }

  return mapRow(data);
}

export async function updatePlan(
  userId: string,
  planId: string,
  plan: ItineraryPlan,
  preferences: TravelPreferences
): Promise<StoredTravelPlan> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      title: plan.title,
      overview: plan.overview,
      plan,
      preferences
    })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`更新行程失败: ${error?.message ?? "未知错误"}`);
  }

  return mapRow(data);
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const supabase = ensureSupabase();
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", planId).eq("user_id", userId);

  if (error) {
    throw new Error(`删除行程失败: ${error.message}`);
  }
}
