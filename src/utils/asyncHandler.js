// with promise

const asyncHandler = (requestHandel) => {
  (req, res, next) => {
    Promise.resolve(requestHandel(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// with callback
/*
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(error.code || error.message || error).json({
      success: false,
      message: error.message || error,
    });
  }
};
export default asyncHandler;
*/
