// 活動與聚會

// 命名為 ClanEvent 以免與瀏覽器內建的 Event 混淆
export interface ClanEvent {
  id: number;
  title: string;
  // YYYY-MM-DD
  eventDate: string;
  // HH:mm；沒有時間表示整天
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  note: string | null;
}

// 沒有 id 時新增，有 id 時更新
export type ClanEventInput = Omit<ClanEvent, 'id'> & { id?: number };
