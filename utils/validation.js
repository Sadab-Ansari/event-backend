const validateTrafficData = (data) => {
  if (!data.page || typeof data.page !== "string" || data.page.trim() === "") {
    return "Page name must be a non-empty string.";
  }
  return null; // No validation errors
};

const validateProgressData = (data) => {
  if (typeof data.completed !== "number" || data.completed < 0) {
    return "Completed tasks must be a non-negative number.";
  }
  if (typeof data.total !== "number" || data.total <= 0) {
    return "Total tasks must be a positive number.";
  }
  if (
    typeof data.percentage !== "number" ||
    data.percentage < 0 ||
    data.percentage > 100
  ) {
    return "Percentage must be a number between 0 and 100.";
  }
  return null; // No validation errors for progress data
};

module.exports = { validateTrafficData };
