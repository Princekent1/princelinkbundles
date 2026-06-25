export function jaybartSyncToast(status: string) {
  if (status === "completed") return "Order marked as completed";
  if (status === "failed") return "Order marked as failed";
  if (status === "fulfilling") return "Order is still processing";
  return `Order status is ${status}`;
}
