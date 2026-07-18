export function validate(schema) {
  return (req, res, next) => {
    try {
      console.log("rq,", req.query);

      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = result.body ?? req.body;

      if (Object.keys(req.query).length) {
        req.query = result.query ?? req.query;
      }
      if (Object.keys(req.params).length) {
        req.params = result.params ?? req.params;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
