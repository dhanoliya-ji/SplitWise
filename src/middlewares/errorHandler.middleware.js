import { IsApiError } from "../utils/ApiError";

const currentEnv = process.env.NODE_ENV || "development";

/**
 * Global error handler for all routes
 */
export default (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  if (IsApiError(err)) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error("[ERROR]", err);

  const errorMessage =
    currentEnv === "development" ? err.message : "Internal server error";

  return res.status(500).json({ error: errorMessage });
};
