/** Ответ 500 без утечки внутреннего текста ошибки клиенту. */
export const sendServerError = (
  res,
  error,
  message = "Не удалось выполнить запрос",
) => {
  console.error(error);
  return res.status(500).json({ error: message });
};

export const fail = (res, status, error) => res.status(status).json({ error });

export const notFound = (res, error = "Not found") => fail(res, 404, error);

/** Express 5 пробрасывает отказ промиса сюда — маршрутам не нужен свой try/catch. */
export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  return sendServerError(res, error, error.clientMessage);
};
