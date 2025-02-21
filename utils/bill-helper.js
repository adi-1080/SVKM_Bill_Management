export const buildDateRangeQuery = (startDate, endDate) => {
  const dateQuery = {};
  if (startDate) dateQuery.$gte = new Date(startDate);
  if (endDate) dateQuery.$lte = new Date(endDate);
  return dateQuery;
};

export const buildAmountRangeQuery = (minAmount, maxAmount) => {
  const amountQuery = {};
  if (minAmount) amountQuery.$gte = Number(minAmount);
  if (maxAmount) amountQuery.$lte = Number(maxAmount);
  return amountQuery;
};
