import { supabase } from "@/integrations/supabase/client";

export async function fetchAllRows<T>(
  table: string,
  select: string,
  filters: (query: any) => any,
  orderBy?: { column: string; ascending?: boolean },
  pageSize = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select(select);
    query = filters(query);
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    const { data, error } = await query.range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData.push(...(data as T[]));
    from += pageSize;

    if (data.length < pageSize) break;
  }

  return allData;
}

export async function fetchAllWithQuery<T>(
  queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData.push(...data);
    from += pageSize;

    if (data.length < pageSize) break;
  }

  return allData;
}
