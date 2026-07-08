export type LifecycleStatus = "Active" | "Pending" | "Inactive";

export type StatusDateRange = {
  startDate: Date | string | number;
  endDate?: Date | string | number | null;
};

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function determineStatus(
  {startDate, endDate}: StatusDateRange,
): LifecycleStatus {
  const referenceDate = new Date();
  const startsOn = startOfDay(toDate(startDate));
  const referenceDay = startOfDay(referenceDate);

  if (startsOn > referenceDay) {
    return "Pending";
  }

  if (endDate) {
    const endsOn = startOfDay(toDate(endDate));

    if (endsOn < referenceDay) {
      return "Inactive";
    }
  }

  return "Active";
}
