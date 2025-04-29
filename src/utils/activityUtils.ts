export type Activity = 'Skiing' | 'Surfing' | 'Outdoor sightseeing' | 'Indoor sightseeing';

export const activityMeta: Record<Activity, { icon: string; color: string }> = {
  'Skiing': { icon: '🎿', color: '#4fc3f7' },
  'Surfing': { icon: '🏄‍♂️', color: '#00bfae' },
  'Outdoor sightseeing': { icon: '🌞', color: '#ffd54f' },
  'Indoor sightseeing': { icon: '🏛️', color: '#b39ddb' },
};

export function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
